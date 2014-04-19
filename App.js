var app=null;
Ext.define('CustomApp', {
	extend: 'Rally.app.App',
	componentCls: 'app',
            
	launch: function() {
		app = this;
		app.iid = null;
		app.names = [];
		app.ids = [];
		app.oids = [];
		app.owners = [];
		app.displaynames = [];

		app.userStore = Ext.create('Rally.data.WsapiDataStore', {
			model: 'User',
			fetch: ['DisplayName','ObjectID'],
			autoLoad: true,
			limit: Infinity,
			filters: [
				{ property: 'disabled', value: false }
			],
			listeners: {
				load: function(ustore, udata) {
					app.addIPicker();
				}
			}
		}); 
	},
	addIPicker: function () {
		var ipicker = Ext.create('Ext.Container', {
			items: [{
				xtype: 'rallyiterationcombobox',
				fieldLabel: 'Choose Iteration',
				storeConfig: {
					listeners: {
						load: function(store, records){
//							console.log(records);
						}
					}
				},
				listeners: {
					select: function(combobox) {
						app.iid = combobox.getRecord().get("ObjectID");
						app.getSnapshots();
					},
					ready: function(combobox) {
						app.iid = combobox.getRecord().get("ObjectID");
						app.getSnapshots();
					}
				}    
			}]
		});
		app.add(ipicker);
	},
	getSnapshots: function() {
		app.mystore = Ext.create('Rally.data.lookback.SnapshotStore', {
			listeners: {
				load: function(sstore, sdata, ssuccess) {
					//process data
					var oname = '';
					app.names = [];	app.ids = []; app.oids = []; app.owners = []; app.displaynames = [];
					Ext.Array.each(sdata, function(myitem) {
						app.ids.push(myitem.get('FormattedID'));
						app.oids.push(myitem.get('ObjectID'));
						app.names.push(myitem.get('Name'));
						app.owners.push(myitem.get('Owner'));
						var urecord = app.userStore.findRecord('ObjectID', myitem.get('Owner'));
						if (urecord) {
//							console.log(urecord.get('DisplayName'));
							app.displaynames.push(urecord.get('DisplayName'));
						} else {
							app.displaynames.push('User Not Found');
						}
						app.displaynames.push(urecord.get('DisplayName'));

					});
					app.calcBlockedTime(sdata); 
				}
			},
			fetch: ["FormattedID", "Name", "Owner", "_ValidFrom", "_ValidTo", "ObjectID", 'Blocked'],
//			hydrate: ["Owner"],  // Would be nice if this would hydrate
			autoLoad: true,
			find: {
				"_ProjectHierarchy" : { "$in": [app.getContext().getProject().ObjectID] },
				"_TypeHierarchy": { "$in": ["HierarchicalRequirement","Defect"] },
				"Iteration" : app.iid,
				"Blocked": true
			}
		});
	},
	calcBlockedTime : function( blockedSnapshots ) {
        var that = this;
        var snapshots = _.pluck(blockedSnapshots,function(s) { return s.data;});
        var granularity = 'minute';
        var tz = 'America/Chicago';
        
        var config = { //  # default work days and holidays
            granularity: granularity,
            tz: tz,
			workDayStartOn: {hour: 8, minute: 0},
			workDayEndBefore: {hour: 17, minute: 0},
            validFromField: '_ValidFrom',
            validToField: '_ValidTo',
            uniqueIDField: 'ObjectID'
        };
        
        var start = moment().dayOfYear(0).toISOString();
        var end =   moment().toISOString();
        tisc = new window.parent._lumenize.TimeInStateCalculator(config);
        tisc.addSnapshots(snapshots, start, end);
        var results = tisc.getResults();
        app.drawGrid(results);
    },
    drawGrid: function( data ) {
		var hticks = 0.0;
		if (app.mytable) {
			app.mytable.destroy();
		}
		app.mytable = Ext.create('Ext.panel.Panel', {
			title: 'Story Block Durations',
			layout: {
				type: 'table',
					columns: 4
			},
			defaults: {
				// applied to each contained panel
				bodyStyle: 'padding:5px'
			},
			width: 600,
			items: [
				{html: '<B>ID</B>'},
				{html: '<B>Name</B>'},
				{html: '<B>Owner</B>'},
				{html: '<B>Total Duration (Hours)</B>'}
				]
		});
		Ext.Array.each(data, function(child) {
			var tindex = app.oids.indexOf(child.ObjectID);
			hticks = child.ticks/60;	// conver minutes to hours
			app.mytable.add([{html: " " + app.ids[tindex] },{html: " " + app.names[tindex] },{html: " " + app.displaynames[tindex] },{html: " " + hticks.toFixed(2) }]);
		});
		app.add(app.mytable);
	}

});
