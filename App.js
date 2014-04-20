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
				limit: Infinity,
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
						console.log('processing: ' + combobox.getRecord().get("Name"));
						if (app.mytable) {
							app.mytable.destroy();
						}
						Ext.getBody().mask('Working...');
						app.getSnapshots();
					},
					ready: function(combobox) {
						app.iid = combobox.getRecord().get("ObjectID");
						console.log('processing Iteration: ' + combobox.getRecord().get("Name"));
						Ext.getBody().mask('Working...');
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
//					console.log(sdata);
					app.names = [];	app.ids = []; app.oids = []; app.owners = []; app.displaynames = [];
					Ext.Array.each(sdata, function(myitem) {
						app.ids.push(myitem.get('FormattedID'));
						app.oids.push(myitem.get('ObjectID'));
						app.names.push(myitem.get('Name'));
						app.owners.push(myitem.get('Owner'));
						var urecord = app.userStore.findRecord('ObjectID', myitem.get('Owner'));
						if (urecord) {
//							console.log(urecord.get('DisplayName'));
							if (urecord.get('DisplayName') !== '') {
								app.displaynames.push(urecord.get('DisplayName'));
							}else {
								app.displaynames.push('No Display Name');
							}
						} else {
							app.displaynames.push('User Not Found');
						}
					});
//					Ext.getBody().mask('Processing ' + app.mystore.getCount() + ' Snapshots...');
					console.log('Processing: ' + app.mystore.getCount() + ' Snapshots...');
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
			},
			sort: { "_ValidFrom": 1 }
		});
	},
	calcBlockedTime : function( blockedSnapshots ) {
        var that = this;
        var snapshots = _.pluck(blockedSnapshots,function(s) { return s.data;});
        var granularity = 'minute';
        var tz = 'America/Chicago';
        var workdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        var holidays = [{month: 12, day: 25}, {month: 1, day: 1}, {year: 2014, month: 5, day: 26}];
        var starttime = {hour: 8, minute: 0};
        var endtime = {hour: 17, minute: 0};
       
        var config = { //  # default work days and holidays
            granularity: granularity,
            tz: tz,
			workDayStartOn: starttime,
			workDayEndBefore: endtime,
			workDays: workdays,
			holidays: holidays,
            validFromField: '_ValidFrom',
            validToField: '_ValidTo',
            uniqueIDField: 'ObjectID'
        };
        Ext.getBody().mask('Working...');
        var start = moment().dayOfYear(0).toISOString();
        var end =   moment().toISOString();
        tisc = new window.parent._lumenize.TimeInStateCalculator(config);
        tisc.addSnapshots(snapshots, start, end);
        var results = tisc.getResults();
        app.drawGrid(results);
        Ext.getBody().unmask();
    },
    drawGrid: function( data ) {
		var hticks = 0.0;
		app.mytable = Ext.create('Ext.panel.Panel', {
			title: 'Story Block Durations',
			layout: {
				type: 'table',
				columns: 4
			},
			defaults: {
				// applied to each contained panel
				bodyStyle: 'padding:5px',
				autoScroll: true
			},
//			width: 800,
			items: [
				{html: '<B>ID</B>'},
				{html: '<B>Name</B>'},
				{html: '<B>Owner</B>'},
				{html: '<B>Total Duration (Hours)</B>'}
				]
		});
		Ext.Array.each(data, function(child) {
			var tindex = app.oids.indexOf(child.ObjectID);
			var myItemURL = "<div><a href='" + Rally.environment.getServer().getBaseUrl()+
				'/#/search?keywords=' +app.ids[tindex]+ "' target='_blank'>" +app.ids[tindex] + "</a></div>";
			hticks = child.ticks/60;	// conver minutes to hours
			app.mytable.add([{html: myItemURL },{html: " " + 
				app.names[tindex] },{html: " " + app.displaynames[tindex] },{html: " " + 
				hticks.toFixed(2) }]);
		});
		app.add(app.mytable);
	}

});
