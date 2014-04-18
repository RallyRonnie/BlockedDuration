var app=null;
Ext.define('CustomApp', {
	extend: 'Rally.app.App',
	componentCls: 'app',
            
	launch: function() {
		app = this;
		app.iid = null;
		var ipicker = Ext.create('Ext.Container', {
			items: [{
				xtype: 'rallyiterationcombobox',
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
			}],
		});
		app.add(ipicker);
	},

	getSnapshots: function() {
		app.mystore = Ext.create('Rally.data.lookback.SnapshotStore', {
			listeners: {
				load: function(store, data, success) {
					//process data
					console.log(data);
					Ext.Array.each(data, function(myitem) {
						console.log(myitem.get('Name'));
					});    
					app.calcBlockedTime(data); 
				}
			},
			fetch: ["FormattedID", "Name", "_ValidFrom", "_ValidTo", "ObjectID", 'Blocked'],
			autoLoad: true,
			find: {
				"_ProjectHierarchy" : { "$in": [app.getContext().getProject().ObjectID] },
				"_TypeHierarchy": { "$in": ["HierarchicalRequirement"] },
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
		var mytable = Ext.create('Ext.panel.Panel', {
			title: 'Story Block Durations',
			layout: {
				type: 'table',
					// The total column count must be specified here
					columns: 2
			},

			defaults: {
				// applied to each contained panel
				bodyStyle: 'padding:20px'
			} //,
//			items: [{
//				html: 'Cell A content',
//				rowspan: 2
//			},{
//				html: 'Cell B content',
//				colspan: 2
//			},{
//				html: 'Cell C content',
//				cellCls: 'highlight'
//			},{
//				html: 'Cell D content'
//			}],
		});
//		table.addRows(results.theItems);

		Ext.Array.each(data, function(child) {
//			var s1 = '{html: ' + child.ObjectID + '}';
		mytable.add(child.ObjectID + child.ticks);
			console.log('ID: ' + child.ObjectID + ' Ticks: ' + child.ticks);
		});
		app.add(mytable);
	}

});
