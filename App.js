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
		
//		app.gridStore = Ext.create('Ext.data.Store', {
//			storeId:'gridStore',
//			fields:['fid', 'name', 'owner', 'ticks'],
//			proxy: {
//				type: 'memory',
//				reader: {
//					type: 'json',
//					root: 'items'
//				}
//			}
//		});
//
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
//						console.log(combobox.getRecord().get("StartDate"));
//						console.log(combobox.getRecord().get("EndDate"));
//						console.log(combobox.getRecord().get("ObjectID"));
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
				load: function(store, data, success) {
					//process data
					console.log(data);
					app.names = [];	app.ids = []; app.oids = []; app.owners = [];
					Ext.Array.each(data, function(myitem) {
						console.log(myitem.get('FormattedID'));
						app.ids.push(myitem.get('FormattedID'));
						app.oids.push(myitem.get('ObjectID'));
						app.names.push(myitem.get('Name'));
						app.owners.push(myitem.get('Owner'));
					});
					console.log(app.owners); 
					app.calcBlockedTime(data); 
				}
			},
			fetch: ["FormattedID", "Name", "Owner", "_ValidFrom", "_ValidTo", "ObjectID", 'Blocked'],
			hydrate: ["Owner"],
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
        console.log(snapshots);
        tisc = new window.parent._lumenize.TimeInStateCalculator(config);
        tisc.addSnapshots(snapshots, start, end);
        var results = tisc.getResults();
//        console.log(results);
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

					// The total column count must be specified here
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
//		table.addRows(results.theItems);
		Ext.Array.each(data, function(child) {
			var aindex = app.oids.indexOf(child.ObjectID);
			hticks = child.ticks/60;	// conver minutes to hours
			app.mytable.add([{html: " " + app.ids[aindex] },{html: "" + app.names[aindex] },{html: "" + app.owners[aindex]},{html: " " + hticks.toFixed(2) }]);
//			console.log('ID: ' + child.ObjectID + ' Ticks: ' + child.ticks);
		});
//		var mygrid = Ext.create('Ext.grid.Panel', {
//			title: 'Blocked Duration',
//			store: Ext.data.StoreManager.lookup('gridStore'),
  //  columns: [
//        { text: 'ID',  dataIndex: 'fid' },
//        { text: 'Name', dataIndex: 'name' },
//        { text: 'Owner', dataIndex: 'owner' },
//        { text: 'Duration (Hours)', dataIndex: 'ticks' }
//    ],
//    height: 200,
//    width: 800
//    renderTo: Ext.getBody()
//		});
//		app.gridStore.load('{fid: '+child.ObjectID
		app.add(app.mytable);
//		app.add(mygrid);
	}

});
