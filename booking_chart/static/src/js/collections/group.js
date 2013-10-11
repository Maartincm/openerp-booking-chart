openerp.unleashed.module('booking_chart', function(booking, _, Backbone, base){
    
    var BaseCollection = base.collections('BaseCollection'),
        _super = BaseCollection.prototype;
    
    var Group = BaseCollection.extend({
        
        model_name: null,
        group_by: null,
        
        initialize: function(models, options){
            
            this.options = _.extend({
                group_by: this.group_by,
                grouped: false,
                parent: null,
                index: null
            }, options);
            
            if(!this.options.grouped && !this.group_by){
                throw new Error('group_by property is required for Group Collection');
            }
            
            this.status = {
                updated: false,
                created: true
            };
            
            this.data = _.extend({
                groups: {},
                removed: []
            }, this.data || {});
            
            _super.initialize.apply(this, arguments);
        },
        
        groupRemoved: function(){
            return this.data.removed;
        },
        
        groupChanged: function(){
            return _.filter(this.groups(), function(group){ return group.status.created || group.status.updated; });
        },
        
        reset: function(){
                        
            if(!this.isGroup()){
                _.each(this.groups(), function(group, index){
                    group.reset();
                    delete this.data.groups[index];
                }, this);
            }

            _super.reset.apply(this, arguments);
        },
        
        
        fetch: function(){
            
            if(!this.isGroup()){
                _.each(this.groups(), function(group){
                    group.status = {
                        updated: false,
                        created: false
                    };
                });    
                this.data.removed = [];
            }
            
            return _super.fetch.apply(this, arguments);
        },
        
        
        set: function(models, options){
            options = _.extend({
                group: true
            }, options);
            
            //ensure we have an array of Backbone.Model to keep a ref between the collection and groups
            models = _.isArray(models) ? models.slice() : [models];
            var prepared = [];
            _.each(models, function(model){
                if(model = this._prepareModel(model, options)){
                    prepared.push(model);    
                }
            }, this);
            
            _super.set.apply(this, [prepared, options]);
            
            this.status.updated = true;
            
            if(options.group){
                this.groupModels(prepared);
            }
        },
        
        remove: function(models, options){
            options = _.extend({
                group: true
            }, options);
        
            //TODO: review this "technique"... method to know if a modification has been applied to the collection...
            var lengths = {};
            lengths.before = this.length
            _super.remove.apply(this, arguments);
            lengths.after = this.length;
            
            if(options.group){
                this.ungroupModels(models, lengths);
            }
        },
        
        isGroup: function(){
            return this.options.grouped;
        },
        
        hasGroup: function(index){
            return !!this.group(index);
        },
        
        group: function(index){
            return this.data.groups[index];
        },
        
        groups: function(){
            return this.data.groups;
        },
        
        groupByIndice: function(model){
            var indice = null, group_by = this.options.group_by;
            
            var data = model instanceof Backbone.Model ? model.attributes : model;
            
            if(_.isString(group_by)){
                indice = data[group_by];
            }
            else if(_.isFunction(group_by)){
                indice = group_by.apply(this, [data]);
            }
            return indice;
        },
        
        groupModels: function(models){
            _.each(models, function(model){
                var index = this.groupByIndice(model); 
                
                if(!this.isGroup()){
                    if(index){
                        this.addToGroup(model, index);
                    }
                }
                else {
                    if(this.options.index != index){
                        throw new Error('can not add a model in a group which has not the same index');
                    }
                    this.options.parent.add(model, {group: false});
                }
            }, this);
        },
        
        addToGroup: function(model, index){
            var groups = this.data.groups;     
            groups[index] = groups[index] || new Group([], { group_by: this.group_by, grouped: true, parent: this, index: index });
            groups[index].add(model, {group: false});
        },
        
        ungroupModels: function(models, lengths){
            var self = this;
            if(!this.isGroup()){
            
                _.each(this.data.groups, function(group){
                    group.remove(models, {group: false});
          
                    if(group.length <= 0){
                        self.removeGroup(group.options.index);
                    }
                });
            }
            else if(lengths.before > lengths.after){
                this.options.parent.remove(models, {group: false});
            }   
        },
        
        removeGroup: function(index){
            if(this.hasGroup(index)){
                this.data.removed.push(index);
                this.data.groups[index].reset([]);
                delete this.data.groups[index];   
            }
        } 
    });

    booking.collections('Group', Group);

});