/**
 * This file contains (rudimentary) utilities for simplifying data flow 
 * between MySql (through Sequelize) and the Client, via NoGap.
 * Cached data is not tracked by the other side, and needs to be sent over the wire explicitely.
 *
 * =How to use DataProviders=
 * There is no cache coherence (i.e. no data binding)
 * `readObject[s]` does generally retrieve less already cached objects. However, there are currently no guarantees, other than consistency.
 * 
 *
 * =How to declare DataProviders=
 * 1. A component can declare DataProviders using the `Base.DataProviders` property.
 * 2. You can add `InstanceProto` to define instance members on all fetched objects available both on `Client` and `Host`.
 * 3. You can customize DataProvider behavior, by providing the `members` property in your DataProvider declaration.
 *  -> E.g. if you want to add associations or access checks, you can override `compileReadObjectsQuery`.
 *  -> E.g. for custom post-query processing, you can override `filterReadObject[s]` (Host).
 *  -> E.g. you can override `onAddedObject` `onRemovedObject`.
 * 4. There are different `CacheEndpoint` classes for `Client` and `Host`.
 * 5. Many methods (such as `getModel` and `compileReadObjectsQuery`) are Host-only.
 *      If they contain sensitive code, you can just declare them in `Host.Caches` instead of `Base`.
 *
 * TODO: Make sure, cache does not grow unbounded
 * TODO: Account for paging + better access management
 * TODO: Cache coherence (i.e. data binding)
 * TODO: Unified query language to use on Client + Host.
 */
"use strict";


var NoGapDef = require('nogap').Def;


module.exports = NoGapDef.component({
    Namespace: 'bjt',

    /**
     * Base is available in both, host and client.
     */
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
        return {
            // ##########################################################################################
            // Memory sets

            _memorySets: {},

            getOrCreateMemorySet: function(name, dataProviderDescriptor) {
                return this._memorySets[name] = (this._memorySets[name] || new this.MemorySet(dataProviderDescriptor));
            },

            MemorySet: squishy.createClass(function(dataProviderDescriptor) {
                this.list = [];
                this.byId = {};

                this._lastUpdatedAtByQueryData = {};
                this._lastUpdatedAtList = [];

                if (dataProviderDescriptor.indices) {
                    // create indices
                    this.indices = new Shared.DataProvider.IndexSet(dataProviderDescriptor);
                }
                else {
                    this.indices = null;
                }
            },{
                // methods

                _serializeQueryData: function(queryData) {
                    //if (_.size(queryData) > 1) debugger;

                    // convert queryData into something that is serializable
                    var serialize = function(obj, depth) {
                        if (depth > 5) {
                            throw new Error('Could not serialize queryData: ' + queryData);
                        }
                        if (SharedContext.IsHost && Shared.DataProvider.isModel(obj)) {
                            return obj.tableName;
                        }
                        if (_.isObject(obj)) {
                            var clone = {};
                            for (var prop in obj) {
                                var value = serialize(obj[prop], depth+1);
                                clone[prop] = value;
                            }
                            return clone;
                        }
                        return obj;
                    };

                    return JSON.stringify(serialize(queryData), 1);
                },

                _addLastUpdatedAt: function(updatedAt, queryData) {
                    if (this._lastUpdatedAtList.length > 100) {
                        // prevent unbounded growing:
                        // kick out the first queryData we used
                        var oldQueryData = this._lastUpdatedAtList.shift();
                        delete this._lastUpdatedAtByQueryData[oldQueryData];
                    }

                    var serializedQueryData = this._serializeQueryData(queryData);
                    this._lastUpdatedAtList.push(serializedQueryData);
                    this._lastUpdatedAtByQueryData[serializedQueryData] = updatedAt;
                },

                /**
                 * Get the last timestamp for the given query.
                 */
                getLastUpdatedAt: function(queryData) {
                    var serializedQueryData = this._serializeQueryData(queryData);
                    return this._lastUpdatedAtByQueryData[serializedQueryData];
                },

                /**
                 * A new object with the given timestamp has been fetched from DB,
                 * using the given queryData.
                 */
                checkUpdatedAt: function(updatedAt, queryData) {
                    if (!updatedAt) return;     // there is no udpatedAt data on this table

                    var serializedQueryData = this._serializeQueryData(queryData);
                    var lastUpdatedAt = this._lastUpdatedAtByQueryData[serializedQueryData];

                    if (!lastUpdatedAt) {
                        this._addLastUpdatedAt(updatedAt, queryData);
                    }
                    else if (updatedAt.getTime() > lastUpdatedAt.getTime()) {
                        // updatedAt is newer and replaces the last one
                        this._lastUpdatedAtByQueryData[serializedQueryData] = updatedAt;
                    }
                },

                clear: function() {
                    // clear list
                    this.list.length = 0;

                    // clear primary index
                    for(var key in this.byId) {
                        this.byId[key] = null;
                    }

                    // clear other indices
                    if (this.indices) {
                        this.indices.clear();
                    }
                },
            }),


            // ##########################################################################################
            // Memory set indices

            _Index: squishy.createClass(function(indexSet, indexDef) {
                // ctor
                this._indexSet = indexSet;
                this._indexDef = indexDef;
                this._root = {};

                // Store the node of each added object by id.
                //      This way, we can make sure that we can remove objects later, even if they were altered.
                this._objectNodeInfo = {};
            },{
                // methods

                clear: function() {
                    this._root = {};
                },

                /**
                 * Gets (and creates if not existing) the node
                 * that matches the given specification
                 */
                getOrCreateNode: function(obj) {
                    var indexDef = this._indexDef;
                    var node = this._root;

                    for (var iProp = 0; iProp < indexDef.key.length-1; ++iProp) {
                        var propertyName = indexDef.key[iProp];
                        if (!obj.hasOwnProperty(propertyName)) break;    // we don't have that info
                        var val = obj[propertyName];

                        // create object if it does not exist yet
                        node = node[val] = node[val] || {};
                    }

                    return node;
                },

                /**
                 * Gets the array or object that matches the given specification.
                 * In case of a non-unique index, if such an object was not cached,
                 * returns newly created empty array.
                 */
                get: function(arg0OrArgs) {
                    var args;
                    if (arg0OrArgs instanceof Array) {
                        // all arguments in one array
                        args = arg0OrArgs;
                    }
                    else {
                        args = arguments;
                    }

                    var indexDef = this._indexDef;
                    console.assert(args.length == indexDef.key.length, 
                        'Invalid arguments for cache index `get` function. ' +
                        'Argument count did not match key length: ' + JSON.stringify(args));

                    var node = this._root;
                    for (var i = 0; i < args.length-1; ++i) {
                        var val = args[i];

                        // create object if it does not exist yet
                        node = node[val] = node[val] || {};
                    }

                    // found container node of the object we are looking for
                    var leafValue = _.last(args);
                    if (!indexDef.unique && !node[leafValue]) {
                        // create empty array
                        node[leafValue] = [];
                    }
                    return node[leafValue];
                },

                _getContainerNode: function(obj) {
                    var indexDef = this._indexDef;
                    var node = this._root;

                    for (var iProp = 0; iProp < indexDef.key.length-1; ++iProp) {
                        var propertyName = indexDef.key[iProp];
                        var val = obj[propertyName];

                        // create object if it does not exist yet
                        node = node[val] = node[val] || {};
                    }

                    return node;
                },

                _addInstance: function(obj) {
                    var indexDef = this._indexDef;

                    // get object's container node
                    var node = this._getContainerNode(obj);
                    var leafPropertyName = _.last(indexDef.key);
                    var leafValue = obj[leafPropertyName];

                    if (leafValue === null || leafValue === undefined) return;     // don't index by null objects

                    if (!indexDef.unique) {
                        // create array, if it does not exist yet
                        var arr = node[leafValue] = node[leafValue] || [];

                        // add object
                        arr.push(obj);
                    }
                    else {
                        // not an array -> One unique object
                        if (node[leafValue]) {
                            console.error('Object was added twice to unique index `' + indexDef.name + '` = ' + leafValue + ':');

                            // separate console line gives us the browser's internal object inspector
                            console.error(obj);
                        }
                        // add object
                        node[leafValue] = obj;
                    }

                    var id = this._indexSet._dataProviderDescriptor.idGetter(obj);
                    this._objectNodeInfo[id] = {
                        node: node,
                        leafValue: leafValue
                    };
                },

                /**
                 * Remove object from this index.
                 * Since objects may be modified prior to a call to `update`, this must work, no matter the object's current state.
                 * That is why, we need to track things explicitly.
                 */
                _removeInstance: function(obj) {
                    var indexDef = this._indexDef;

                    // get object's container node
                    var id = this._indexSet._dataProviderDescriptor.idGetter(obj);
                    var nodeInfo = this._objectNodeInfo[id];

                    if (nodeInfo) {
                        var node = nodeInfo.node;
                        var leafValue = nodeInfo.leafValue;
                        delete this._objectNodeInfo[id];

                        if (!indexDef.unique) {
                            var arr = node[leafValue];
                            if (!arr) {
                            	console.error('INTERNAL ERROR: Tried to remove object from index `' + indexDef.name + '` ' +
                                'which has not been added in the first place - ' + obj);
                                return;
                            }

                            // TODO: This can become very slow...
                        	//		(good thing, deletion is usually not performance critical)
                            var len = arr.length;
                            _.remove(arr, obj);
                            if (arr.length == len) {
                                console.error('Could not remove object from index `' + indexDef.name + '`:');

                                // separate console line gives us the browser's internal object inspector
                                console.error(obj);
                            }
                        }
                        else {
                            // remove object
                            delete node[leafValue];

                            // TODO: Consider porpagating and deleting parent empty ancestors as well
                        }
                    }
                }
            }),

            /**
             * This is the type of all DataProviders' `indices` property:
             * It is the set of all its (for now non-primary) indices.
             * Each of them represented by the `_Index` type.
             */
            IndexSet: squishy.createClass(function(dataProviderDescriptor) {
                // ctor
                this._dataProviderDescriptor = dataProviderDescriptor;

                var indexDefs = dataProviderDescriptor.indices;

                // create additional indices:
                // Each index declaration is the name of a property.
                // `byId` stores an array for each unique value of that property, containing all corresponding objects.
                if (!(indexDefs instanceof Array)) {
                    throw new Error('Invalid index definition in DataProvider `' + dataProviderDescriptor.dataProviderName + '` - `indices` must be an array of index definitions.');
                }

                this._indexDefs = indexDefs;
                for (var iDef = 0; iDef < indexDefs.length; ++iDef) {
                    var indexDef = indexDefs[iDef];

                    if (!indexDef || !(indexDef.key instanceof Array)) {
                        throw new Error('Invalid index definition in DataProvider `' + dataProviderDescriptor.dataProviderName + '` - Each entry in DataProvider\'s `indices` must be an object with ' +
                            'a property `key` that is an array of column names (containing at least one column), representing a composite key.');
                    }

                    // make sure, index has a proper name
                    indexDef.name = _.isString(indexDef.name) && 
                        indexDef.name ||
                        this._makeIndexName(indexDef.key);

                    // create index
                    if (this[indexDef.name]) {
                        throw new Error('Invalid index definition in DataProvider `' + dataProviderDescriptor.dataProviderName + 
                            '` - Invalid or duplicate index name `' + indexDef.name + '`.');
                    }

                    this[indexDef.name] = new Shared.DataProvider._Index(this, indexDef);
                }
            }, {
                // methods

                /**
                 * Clear all indices
                 */
                clear: function() {
                    var indexDefs = this._indexDefs;
                    for (var iIndex = 0; iIndex < indexDefs.length; ++iIndex) {
                        var indexDef = indexDefs[iIndex];
                        var index = this[indexDef.name];
                        index.clear();
                    }
                },

                _makeIndexName: function(keyProperties) {
                    return keyProperties.join('_');
                },

                _addInstance: function(obj) {
                    // iterate over all indices and add object to each of them
                    var indexDefs = this._indexDefs;
                    for (var iIndex = 0; iIndex < indexDefs.length; ++iIndex) {
                        var indexDef = indexDefs[iIndex];
                        var index = this[indexDef.name];
                        index._addInstance(obj);
                    }
                },

                _removeInstance: function(obj) {
                    // iterate over all indices and remove object from each of them
                    var indexDefs = this._indexDefs;
                    for (var iIndex = 0; iIndex < indexDefs.length; ++iIndex) {
                        var indexDef = indexDefs[iIndex];
                        var index = this[indexDef.name];
                        index._removeInstance(obj);
                    }
                }
            }),
                
            // ##########################################################################################
            // Managing + Flushing of all caches

            clearAllCaches: function() {
                // TODO: Make sure, this is in sync with client
                for (var dataProviderName in this._memorySets) {
                    var memorySet = this._memorySets[dataProviderName];
                    memorySet.clear();
                };
            },

            Private: {
                __ctor: function() {
                    /**
                     * Map of all existing dataProviders, indexed by name.
                     */
                    this.dataProviders = {};
                },


                // ##########################################################################################
                // Instances of cached objects

                /**
                 * Instance base class.
                 * Any InstanceProto will be derived from this.
                 */
                InstanceClassBase: squishy.createClass(function(data) {
                    // ctor

                    // copy data into object
                    for (var propName in data) {
                        if (!data.hasOwnProperty(propName)) continue;

                        var prop = data[propName];
                        if (prop instanceof Function) continue; // never copy functions

                        this[propName] = prop;
                    }
                },{
                    // methods

                    /**
                     * `initialize` function is called right after construction.
                     */
                    initialize: function(dataProvider) {
                    },

                    /**
                     * `getSerializableRawData` is called by the transport layer to get the raw data.
                     */
                    getSerializableRawData: function() {
                        // return object itself
                        return this;
                    }
                }),


                // ##########################################################################################
                // Installing

                initDataProviders: function() {
                    // install DataProviders
                    this.Instance.forEach(function(component) {
                        this._autoInstallComponentDataProviders(component);
                    }.bind(this));

                    // install DataProvider event handlers
                    this.Instance.forEach(function(component) {
                        this._installDataProviderEventHandlers(component);
                    }.bind(this));
                },

                /**
                 * Install DataProviders of given declarations in the given component.
                 */
                installComponentDataProviders: function(component, dataProviderDescriptors, autoInit) {
                    dataProviderDescriptors = dataProviderDescriptors || component.Shared.DataProviders;

                    if (dataProviderDescriptors instanceof Function) {
                        dataProviderDescriptors = dataProviderDescriptors.call(component, this);
                    }

                    for (var dataProviderName in dataProviderDescriptors) {
                        console.assert(dataProviderName, 
                            'Failed to install DataProvider. Invalid `DataProviders` declaration has no name in component: `' + 
                                component.Shared + '`.');

                        var dataProviderDescriptor = dataProviderDescriptors[dataProviderName];
                        this.installComponentDataProvider(component, dataProviderName, dataProviderDescriptor, autoInit);
                    };
                },

                /**
                 * Add the given DataProvider to the set of the given component's DataProviders (if not added yet)
                 * and install it.
                 */
                installComponentDataProvider: function(component, dataProviderName, dataProviderDescriptor, autoInit) {
                    // Make sure, the DataProvider can be added as-is to the component
                    console.assert(!component[dataProviderName], 
                        'Failed to install DataProvider. Component `' + component.Shared + 
                        '` already defined instance property with name of DataProvider `' + 
                        dataProviderName + '`. ' +
                        'Make sure that component instance properties do not have the same name as ' + 
                        'any DataProvider, defined by that component.');

                    // ignore manually initialized DataProviders during auto-init phase
                    if (dataProviderDescriptor.manualInit) {
                        console.error('Manual init of DataProvider: ' + dataProviderName);
                    }

                    if (autoInit && dataProviderDescriptor.manualInit) return null;

                    dataProviderDescriptor.dataProviderName = dataProviderName;

                    if (!dataProviderDescriptor.idProperty) {
                        // for now, we require a single id property that identifies a unique id for each object
                        // composite id keys are currently not supported...
                        throw new Error('Invalid DataProvider has no `idProperty`: ' + dataProviderName);
                    }

                    // ensure correct `idGetter` function
                    var idGetter = dataProviderDescriptor.idGetter = dataProviderDescriptor.idGetter || 
                        (dataProviderDescriptor.idProperty ? 
                            eval('(function(obj) { return obj.' + dataProviderDescriptor.idProperty + '; } )') :
                            dataProviderDescriptor.idGetter);
                    console.assert(idGetter instanceof Function, 
                        'Failed to install DataProvider. Invalid DataProvider declaration did ' +
                        'not define Function `idGetter` or String `idProperty`: ' + dataProviderName + '');

                    // ensure correct `idSetter` function
                    var idSetter = dataProviderDescriptor.idSetter = dataProviderDescriptor.idSetter || 
                        (dataProviderDescriptor.idProperty ? 
                            eval('(function(obj, value) { obj.' + dataProviderDescriptor.idProperty + ' = value; } )') :
                            dataProviderDescriptor.idSetter);
                    console.assert(idSetter instanceof Function, 
                        'Failed to install DataProvider. Invalid DataProvider declaration did ' +
                        'not define Function `idSetter` or String `idProperty`: ' + dataProviderName + '');

                    if (dataProviderDescriptor.InstanceProto && (!dataProviderDescriptor.members || !dataProviderDescriptor.members.InstanceClass)) {
                        // build InstanceClass and add to DataProvider description
                        console.assert(typeof(dataProviderDescriptor.InstanceProto) === 'object', 
                            'InstanceProto of DataProvider instances must be an object ' +
                            'containing instance methods only. Instead of providing a constructor, ' +
                            'simply override the `initialize` method.');
                        dataProviderDescriptor.members = dataProviderDescriptor.members || {};

                        dataProviderDescriptor.members.InstanceClass = squishy.extendClass(
                            this.InstanceClassBase,
                            dataProviderDescriptor.InstanceProto);
                    }

                    // create DataProvider endpoint
                    var dataProvider;
                    try {
                        // create DataProvider endpoint from DataProvider descriptor
                        dataProvider = this._createDataProviderEndpoint(component, dataProviderDescriptor);

                        // add method to dataProviderDescriptor object to retrieve DataProvider instance
                        dataProviderDescriptor.getDataProvider = function() { return dataProvider; };

                        // call events
                        if (component.onDataProviderCreated) {
                            component.onDataProviderCreated(dataProvider);
                        }
                    }
                    catch (err) {
                        throw new Error('Failed to install DataProvider. An error occured for `' + dataProviderName + 
                            '` in component `' + component.Shared + '` - ' + err.stack);
                    }

                    this.Tools.traceLog('Initialized DataProvider `' + dataProviderName + '` in component `' + component.Shared + '`.');

                    return dataProvider;
                },

                _createDataProviderEndpoint: function(component, dataProviderDescriptor) {
                    // make sure, DataProvider is not yet registered for this instance set
                    var dataProviderName = dataProviderDescriptor.dataProviderName;
                    if (this.dataProviders[dataProviderName]) {
                        throw new Error('Tried to register DataProvider with same name twice: ' + dataProviderName);
                    }

                    // get to the creation part
                    var model = component.Shared.Model;
                    var otherMembers = dataProviderDescriptor.members;
                    var DataProviderClass = this.Shared.DataProviderEndpoint;

                    var dataProvider = new DataProviderClass(dataProviderName, dataProviderDescriptor);
                    dataProvider.Instance = component.Instance;

                    dataProvider.getModel = function() {
                        console.assert(model, 'DataProvider\'s component did neither define `Model` nor override `getModel` - ' + 
                            dataProviderName);
                        return model;
                    };


                    if (otherMembers) {
                        // add other members and overrides
                        for (var key in otherMembers) {
                            var member = otherMembers[key];
                            dataProvider[key] = member;
                        }
                    }

                    // add DataProvider object to DataProvider registry
                    this.dataProviders[dataProviderName] = dataProvider;

                    // add DataProvider object to component
                    component[dataProviderName] = dataProvider;

                    return dataProvider;
                },

                /**
                 * This is called internally to automatically install DataProviders of given component.
                 * This will not initialize DataProviders that are explicitly marked as "manualInit".
                 */
                _autoInstallComponentDataProviders: function(component) {
                    var dataProviderDescriptors = component.Shared.DataProviders;
                    if (!dataProviderDescriptors || component._DataProviders_initialized) return;

                    this.installComponentDataProviders(component, dataProviderDescriptors);

                    component._DataProviders_initialized = 1;      // prevent repeated initialization
                },

                /**
                 * Install DataProvider event handlers.
                 */
                _installDataProviderEventHandlers: function(component) {
                    // hook-up all DataProvider events
                    if (!component.dataProviderEventHandlers || component._DataProviders_EventHandlers_initialized) return;

                    for (var dataProviderName in component.dataProviderEventHandlers) {
                        var callbacks = component.dataProviderEventHandlers[dataProviderName];
                        var dataProvider = this.getDataProvider(dataProviderName);
                        console.assert(dataProvider, 'Invalid entry in `' + component.Shared.Def.FullName + 
                            '.dataProviderEventHandlers`: DataProvider `' + dataProviderName + '` does not exist, or has not been initialized yet.');

                        var events = dataProvider.events;
                        console.assert(events, 'Invalid entry in `' + component.Shared.Def.FullName + 
                            '.dataProviderEventHandlers`: DataProvider `' + dataProviderName + '` does not have property `events`.');

                        for (var eventName in callbacks) {
                            // get event
                            var evt = events[eventName];
                            console.assert(evt, 'Invalid entry in `' + component.Shared.Def.FullName + 
                                '.dataProviderEventHandlers`: DataProvider `' + dataProviderName + 
                                '` does not have event property `events.' + eventName + '`.');

                            // get callback function
                            var callback = callbacks[eventName];
                            console.assert(callback instanceof Function, 
                                'Invalid entry in `' + component.Shared.Def.FullName + 
                                '.dataProviderEventHandlers`: Entry `' + eventName + '` is not a function.');

                            // hook up callback function to the event
                            evt.addListener(callback);
                        }
                    }

                    component._DataProviders_EventHandlers_initialized = 1;      // prevent repeated initialization
                },



                // ################################################################################################
                // DataProvider management

                /**
                 * 
                 */
                getDataProvider: function(dataProviderName) {
                    return this.dataProviders[dataProviderName];
                },

            },


            // ################################################################################################
            // DataProvider base class

            /**
             * Class from which all DataProvider objects are derived.
             */
            DataProviderEndpointBase: squishy.createClass(function(dataProviderName, dataProviderDescriptor, hasMemorySet) {
                // ctor
                this.name = dataProviderName;
                this._dataProviderDescriptor = dataProviderDescriptor;
                
                /**
                 * This DataProvider's events
                 */
                this.events = {
                    /**
                     * Endpoints: Both
                     * Called right after a new object has been wrapped.
                     */
                    wrapped: squishy.createEvent(/* newObject */),

                    /**
                     * Endpoints: Both
                     * Called when the host signaled that the query did not succeed.
                     */
                    error: squishy.createEvent(/* err */),

                    /**
                     * Endpoints: Client
                     * Called when sending read request (for one or more objects) to Host.
                     */
                    sendingReadQueryToHost: squishy.createEvent(/* queryInput */),

                    /**
                     * Endpoints: Client
                     * Called right before updating the cache with all deltas that have been sent by the server.
                     * The given data might contain previously cached data, in addition to uncached data.
                     */
                    updating: squishy.createEvent(/* newData, queryInput, dataProvider */),

                    /**
                     * Endpoints: Client
                     * Called right after updating the cache with all deltas that have been sent by the server.
                     */
                    updated: squishy.createEvent(/* newData, queryInput, dataProvider */),

                    /**
                     * Endpoints: Client
                     * Called right after an object has been removed from cache.
                     */
                    removed: squishy.createEvent(/* newObject */),
                };

                this._reset(hasMemorySet);
            }, {
                // methods

                hasMemorySet: function() {
                    return !!this._memorySet;
                },

                hasHostMemorySet: function() {
                    return this._dataProviderDescriptor.hasHostMemorySet;
                },

                _reset: function(hasMemorySet) {
                    hasMemorySet = hasMemorySet || this._memorySet;

                    if (hasMemorySet) {
                        // a DataProvider stores a list and `byId` index of the same set of objects:
                        // Lists make iterating faster, while the `byId` index makes look-up by id faster.
                        this._memorySet = Shared.DataProvider.getOrCreateMemorySet(this.name, this._dataProviderDescriptor);
                        this.list = this._memorySet.list;
                        this.byId = this._memorySet.byId;
                        this.indices = this._memorySet.indices;
                    }
                    else {
                        this.list = null;
                        this.byId = null;
                        this.indices = null;
                    }
                },

                // ####################################################################
                // Read

                readObject: squishy.abstractMethod(/* queryInput */),

                readObjects: squishy.abstractMethod(/* queryInput */),

                /**
                 * Get object from cache. This only returns something on endpoints with a local memory set.
                 * NOTE: The id must correspond to `idGetter` or `idProperty` of the DataProvider declaration.
                 */
                getObjectNowById: function(id) {
                    return this.hasMemorySet() && this.byId[id];
                },

                getObjectById: function(id) {
                    if (!SharedContext.IsHost) {
                        return Promise.reject('`getObjectById` can currently only be called by Host');
                    }

                    var obj = this.getObjectNowById(id);
                    return obj &&
                        Promise.resolve(obj) ||
                        this.findObject(id, id, true);
                },

                /**
                 * Get object from cache.
                 * NOTE: The id must correspond to `idGetter` or `idProperty` of the DataProvider declaration.
                 */
                getObjectNow: function(queryInput) {
                    if (!this.hasMemorySet()) return null;

                    // TODO: Support query language to also support general queryInputs on the DataProvider/cache
                    if (isNaNOrNull(queryInput)) {
                        throw new Error('Invalid call to `getObjectNow` has input: ' + queryInput);
                    }
                    return this.byId[queryInput];        // look up by id
                },

                /**
                 * Get list of all currently cached objects.
                 */
                getObjectsNow: function(queryInput) {
                    if (!this.hasMemorySet()) return null;

                    if (queryInput) {
                        return Promise.reject(makeError('error.internal',
                            '`getObjectsNow` must be overridden to support custom query input in DataProvider `' + 
                            this.name + '` - ' + queryInput));
                    }

                    // TODO: Support query language to also support general queryInputs on the DataProvider/cache
                    return this.list;
                    //return null;
                },

                getObjectsNowSince: function(queryInput, ignoreAccessCheck, since) {
                    var objects = this.getObjectsNow(queryInput);
                    var result;
                    if (since && objects) {
                        result = [];
                        for (var i = 0; i < objects.length; ++i) {
                            var obj = objects[i];
                            if (!obj.updatedAt || obj.updatedAt.getTime() > since.getTime()) {
                                result.push(obj);
                            }
                        }
                    }
                    else {
                        result = objects;
                    }
                    return result;
                },

                /**
                 * Checks cache first, then reads, if not present.
                 * Returns promise.
                 */
                getObject: function(queryInput, ignoreAccessCheck, sendToClient, allowNull) {
                    var obj = this.hasMemorySet() && this.getObjectNow(queryInput, ignoreAccessCheck);
                    if (obj) {
                        // object was already cached -> return Promise
                        return Promise.resolve(obj);
                    }
                    else {
                        // object needs to be fetched from DB
                        return this.readObject(queryInput, ignoreAccessCheck, sendToClient, allowNull);
                    }
                },


                // ####################################################################
                // Object wrapping

                /**
                 * Called on every piece of data from the DB, on Client, as well as Host.
                 * If a prototype/ctor is given, creates a new object of given prototype/ctor, and given data.
                 * Might return a different (e.g. re-constructed) object.
                 */
                wrapObject: function(data) {
                    if (!data) return null;

                    var obj;
                    if (this.InstanceClass) {
                        console.assert(this.InstanceClass instanceof Function, 
                            'INTERNAL ERROR: DataProvider InstanceClass must be a constructor.');

                        // create new object, set `data`, then initialize.
                        obj = new this.InstanceClass(data);
                        obj.initialize(this);
                    }
                    else {
                        obj = data;
                    }

                    // notify event handlers
                    this.onWrapObject(obj);
                    this.events.wrapped.fire(obj);

                    return obj;
                },
                
                /**
                 * Called when given new object has been retrieved from DB, Client or Host, and just wrapped.
                 * This is to emulate ActiveRecord functionality (wrap database rows into full objects).
                 */
                onWrapObject: function(object) {
                },

                onError: function(err) {
                    this.Instance.DataProvider.Tools.handleError(err, 'DataProvider error for `' + this.name + '`');
                },


                // ################################################################################################
                // In-memory set management

                _notifyAddedObjectActiveComponents: function(object) {

                },

                _notifyChangedObjectActiveComponents: function(object) {

                },

                _notifyRemovedObjectActiveComponents: function(object) {

                },

                /**
                 * Called when given object has been added to cache.
                 */
                onAddedObject: function(object) {
                },

                /**
                 * Called when given object has been removed from cache.
                 */
                onRemovedObject: function(object) {
                },

                /**
                 * Called after the given object updates have been applied to the cache.
                 */
                onDataAdded: function(newData) {
                },

                /**
                 * Deletes the given object or obejct of given id from cache.
                 * NOTE: `id` must correspond to `idGetter` or `idProperty` of the DataProvider declaration.
                 */
                removeFromCache: function(objectOrId) {
                    if (!this.hasMemorySet()) return;

                    var id;
                    if (isNaNOrNull(objectOrId)) {
                        // argument is not a number: We assume object is given
                        // lookup id
                        id = this._dataProviderDescriptor.idGetter.call(this, objectOrId)
                    }
                    else {
                        // argument is a number: We assume, id is given
                        id = objectOrId;
                    }

                    // remove from key index
                    var obj = this.byId[id];
                    if (obj) {
                        delete this.byId[id];

                        // remove from list
                        // TODO: This is very slow (but should not be called often, so its ok)...
                        for (var i = 0; i < this.list.length; ++i) {
                            var entry = this.list[i];
                            if (this._dataProviderDescriptor.idGetter.call(this, entry) == id) {
                                this.list.splice(i, 1);
                                break;
                            }
                        };

                        // remove from indices
                        if (this.indices) {
                            this.indices._removeInstance(obj);
                        }

                        // notify
                        this._notifyRemovedObjectActiveComponents(obj);
                        this.onRemovedObject(obj);
                        this.events.removed.fire(obj);
                    }

                    // return deleted object
                    return obj;
                },

                /**
                 * Shallow-merges the given array of `newData` into the set of in-memory cached objects.
                 * Shallow-merge means that the data of each object in the `newData` array is merged
                 * into the cached object of same id, by shallow-copying each property.
                 * Simply adds the object to the cache, if it was not cached previously.
                 *
                 * @see http://en.wikipedia.org/wiki/Object_copy#Shallow_copy
                 */
                _applyChanges: function(data, queryInput, queryData) {
                    if (!this.hasMemorySet()) {
                        // just wrap it, that's it
                        for (var iObj = 0; data && iObj < data.length; ++iObj) {
                            var newValues = data[iObj];

                            // fix default updatedAt and createdAt columns
                            if (newValues.createdAt) {
                                newValues.createdAt = new Date(newValues.createdAt);
                            }
                            if (newValues.updatedAt) {
                                newValues.updatedAt = new Date(newValues.updatedAt);
                            }

                            data[iObj] = this.wrapObject(newValues);
                        }
                        return data;
                    }

                    var list = this.list;
                    var byId = this.byId;
                    var idGetter = this._dataProviderDescriptor.idGetter;

                    // keep track only of changed objects
                    var newData = [];

                    if (data) {
                        // 1. remove all non-updates
                        for (var iObj = 0; iObj < data.length; ++iObj) {
                            var newValues = data[iObj];
                            var id = idGetter.call(this, newValues);

                            // fix default updatedAt and createdAt columns
                            if (newValues.createdAt) {
                                newValues.createdAt = new Date(newValues.createdAt);
                            }
                            if (newValues.updatedAt) {
                                newValues.updatedAt = new Date(newValues.updatedAt);

                                var key = queryData || queryInput;
                                this._memorySet.checkUpdatedAt(newValues.updatedAt, key);
                            }

                            console.assert(id, 'Invalid object had no but NEEDS an id in `_applyChanges` ' +
                                'of DataProvider `' + this.name + '` - ' +
                                'That happens either because the object does not have an id, ' +
                                'or the DataProvider declaration\'s `idGetter` or `idProperty` are ill-defined.');

                            var obj = byId[id];
                            if (!obj) {
                                // new object is about to be added

                                // notify
                                var obj = this.wrapObject(newValues);
                                newData.push(obj);
                            }
                            else {
                                // object was cached previously:
                                newData.push(newValues);

                                // // check if it has changed
                                // for (var propName in newValues) {
                                //     var newValue = newValues[propName];
                                //     var oldValue = obj[propName];
                                //     if (!_.isEqual(newValue, oldValue)) {
                                //         // this object (probably) has changed
                                //         newData.push(newValues);
                                //         break;
                                //     }
                                // }
                            }
                        };
                    }

                    // fire "updating" event
                    this.events.updating.fire(newData, queryInput, this);

                    if (data) {
                        // 2. apply all updates only to changed objects
                        for (var iObj = 0; iObj < newData.length; ++iObj) {
                            var newValues = newData[iObj];
                            var id = idGetter.call(this, newValues);

                            var obj = byId[id];
                            if (!obj) {
                                // object was not cached previously:
                                obj = newValues;

                                // add new object to cache
                                list.push(obj);
                                byId[id] = obj;

                                // add to indices
                                if (this.indices) {
                                    this.indices._addInstance(obj);
                                }

                                this._notifyAddedObjectActiveComponents(obj);
                                
                                // fire client-side only event
                                this.onAddedObject(obj);
                            }
                            else {
                                // remove from indices
                                if (this.indices) {
                                    this.indices._removeInstance(obj);
                                }

                                // object was cached previously:
                                // shallow-copy new properties
                                for (var propName in newValues) {
                                    obj[propName] = newValues[propName];
                                }

                                // re-add to indices
                                if (this.indices) {
                                    this.indices._addInstance(obj);
                                }

                                this._notifyChangedObjectActiveComponents(obj);

                                // override new object with reference to old one
                                newData[iObj] = obj;
                            }
                        };
                    }

                    //console.log('Updated cache: ' + this.name);

                    // fire "updated" event
                    this.events.updated.fire(newData, queryInput, this);

                    return newData;
                },
            })
        }
    }),



    /**
     * 
     */
    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) {
        var componentsRoot = '../';
        var libRoot = componentsRoot + '../lib/';
        var SequelizeUtil;

        return {
            __ctor: function() {
                SequelizeUtil = require(libRoot + 'SequelizeUtil');

                /**
                 * Host-side DataProvider endpoint class.
                 */
                this.DataProviderEndpoint = squishy.extendClass(this.DataProviderEndpointBase, function(dataProviderName, dataProviderDescriptor) {
                    // ctor
                    this._super(dataProviderName, dataProviderDescriptor, dataProviderDescriptor.hasHostMemorySet);

                    // if (this.hasMemorySet()) {
                    //     // make sure, members pair up nicely
                    //     var pairs = [
                    //         ['compileReadObjectQuery', 'getObjectNow'],
                    //         ['compileReadObjectsQuery', 'getObjectsNow'],
                    //     ];
                    //     pairs.forEach(function(pair) {
                    //         if (otherMembers[pair[0]] && !otherMembers[pair[1]]) {
                    //             throw new Error('Invalid DataProvider description has ' +
                    //                 '`' + pair[0] + '`, but missing `' + pair[1] + '`');
                    //         }
                    //     })
                    // }
                },{
                    // methods

                    // ####################################################################
                    // Explicit access checks

                    hasWritePermissions: function() {
                        var user = this.Instance.User.currentUser;

                        // only for staff members by default
                        return Shared.User.isStaff(user);
                    },


                    // ####################################################################
                    // Events

                    /**
                     * Called after object has just been fetched from DB.
                     * Can be overwritten for customized post-query processing.
                     */
                    filterReadObject: function(object) {
                        return object;
                    },

                    onCreateObject: function(object) {
                        return object;
                    },


                    /**
                     * Note: Host only
                     */
                    onQueriedObject: function(object) {
                        return object;
                    },

                    /**
                     * Called after objects have just been fetched from DB.
                     * Can be overwritten for customized post-query processing.
                     */
                    filterReadObjects: function(objects) {
                        return objects;
                    },


                    // ####################################################################
                    // Overwritable compile* functions

                    /**
                     * Compiles a sequelize query to get a single rows matching (client-)given queryInput.
                     */
                    compileReadObjectQuery: function(queryInput, ignoreAccessCheck) {
                        // get object from table
                        if (isNaNOrNull(queryInput)) {
                            // three possibilities:
                            // 1. Your code has a bug and you forgot to override `compileReadObjectQuery` to handle custom queryInput
                            // 2. Your code has a bug and initiated a request with invalid queryInput
                            // 3. User cheated and sent invalid queryInput.
                            console.warn('Client requested object from DataProvider `' + this.name + 
                                '` with queryInput: ' + squishy.objToString(queryInput, true, 3));
                            return Promise.reject(makeError('error.invalid.request'));
                        }
                        else {
                            // return id
                            return queryInput;
                        }
                    },

                    /**
                     * Compiles a sequelize query to get multiple rows matching (client-)given queryInput.
                     */
                    compileReadObjectsQuery: function(queryInput, ignoreAccessCheck) {
                        if (queryInput) {
                            // three possibilities:
                            // 1. Your code has a bug and you forgot to override `compileReadObjectsQuery` to handle custom queryInput
                            // 2. Your code has a bug and initiated a request with invalid queryInput
                            // 3. User cheated and sent invalid queryInput.
                            console.warn('Client requested objects from DataProvider `' + this.name + 
                                '` with queryInput: ' + squishy.objToString(queryInput, true, 3));
                            return Promise.reject(makeError('error.invalid.request'));
                        }
                        else {
                            // return empty filter
                            return {};
                        }
                    },
                    
                    compileCreateObjectQuery: function(queryInput, ignoreAccessCheck) {
                        if (!ignoreAccessCheck && !this.hasWritePermissions()) {
                            // only for staff members
                            return Promise.reject('error.invalid.permissions');
                        }
                        else {
                            // staff permissions -> Simply forward the request
                            // (still kinda dangerous)
                            return queryInput;
                        }
                    },

                    /**
                     * Default Update query
                     */
                    compileUpdateObjectQuery: function(updateData, ignoreAccessCheck) {
                        var objId;
                        if (!ignoreAccessCheck && !this.hasWritePermissions()) {
                            // only for staff members
                            return Promise.reject('error.invalid.permissions');
                        }
                        else if (isNaNOrNull(objId = this._dataProviderDescriptor.idGetter(updateData))) {
                            // `updateData` must contain id
                            return Promise.reject(makeError('error.invalid.request', 
                                '`updateData` did not contain idProperty `' + 
                                this._dataProviderDescriptor.idProperty + '` for DataProvider `' + this._dataProviderDescriptor.dataProviderName + '`.'));
                        }
                        else {
                            // build arguments to update call
                            var selector = { where: {} };
                            selector.where[this._dataProviderDescriptor.idProperty] = objId;

                            return {
                                values: updateData,
                                selector: selector
                            };
                        }
                    },

                    compileDeleteObjectQuery: function(objId, ignoreAccessCheck) {
                        if (!ignoreAccessCheck && !this.hasWritePermissions()) {
                            // only for staff members
                            return Promise.reject('error.invalid.permissions');
                        }
                        else {
                            return Promise.resolve(objId);
                        }
                    },


                    // ####################################################################
                    // Send

                    /**
                     * Send object delta to Client.
                     */
                    applyChange: function(object, queryInput, dontSendToClient) {
                        if (object) {
                            return this.applyChanges([object], queryInput, dontSendToClient)[0];
                        }
                        return null;
                    },

                    /**
                     * Send object deltas to Client.
                     */
                    applyChanges: function(objects, queryInput, dontSendToClient, queryData) {
                        // update Host-side cache and wrap
                        var wrappedObjects = this._applyChanges(objects, queryInput, queryData);

                        if (!dontSendToClient) {
                            this.sendChangesToClient(objects);
                        }
                        return wrappedObjects;
                    },

                    sendChangeToClient: function(object) {
                        return this.sendChangesToClient([object]);
                    },

                    sendChangesToClient: function(objects) {
                        if (!this.Instance.DataProvider.client) return;

                        if (this.filterClientObject) {
                            var filteredObjects = [];
                            for (var i = 0; i < objects.length; ++i) {
                                var filteredObject = this.filterClientObject(_.clone(objects[i]));
                                filteredObjects.push(filteredObject);
                            };
                            objects = filteredObjects;
                        }
                        this.Instance.DataProvider.client.applyChanges(this.name, objects);
                    },

                    /**
                     * Tell client to remove the given object or object of given id
                     * to be removed from cache.
                     */
                    applyRemove: function(objectOrId, dontSendToClient) {
                        var id;
                        var idGetter = this._dataProviderDescriptor.idGetter;
                        
                        if (isNaNOrNull(objectOrId)) {
                            // argument is not a number: We assume object is given
                            // -> lookup id
                            id = idGetter.call(this, objectOrId)
                        }
                        else {
                            // argument is a number: We assume, id is given
                            id = objectOrId;
                        }

                        // remove from Host cache
                        this.removeFromCache(objectOrId);

                        if (!dontSendToClient) {
                            // remove from Client cache
                            this.Instance.DataProvider.client.removeFromCachePublic(this.name, id);
                        }
                    },

                    /**
                     * Query object and send to client.
                     * For many cache implementations, `queryInput` is simply the object's id.
                     */
                    applyChangeFromQuery: function(queryInput) {
                        // query object from DB
                        return this.getObject(queryInput, false, true);
                    },

                    /**
                     * Query objects and send to client.
                     */
                    applyChangesFromQuery: function(queryInput) {
                        // query objects from DB
                        return this.getObjects(queryInput, false, true);
                    },


                    // ####################################################################
                    // Read

                    /**
                     * Check DB for updates, then return objects matching the given input
                     */
                    getObjects: function(queryInput, ignoreAccessCheck, sendToClient) {
                        // re-fetch newest objects from DB
                        return this.readObjects(queryInput, ignoreAccessCheck, false)
                        .bind(this)
                        .then(function(newObjects) {
                            var objects;
                            if (this.hasMemorySet()) {        // only if Host has memory set, readObjects might not return all the required objects
                                objects = this.getObjectsNow(queryInput, ignoreAccessCheck);
                            }
                            else {
                                objects = newObjects;
                            }

                            if (sendToClient) {
                                // if on host, we might want to send this stuff straight to the client
                                this.sendChangesToClient(objects);
                            }
                            return objects;
                        });
                    },

                    /**
                     * Query data from DB.
                     */ 
                    readObject: function(queryInput, ignoreAccessCheck, sendToClient, allowNull) {
                        return Promise.resolve(queryInput)
                        .bind(this)

                        // first, get query metadata
                        .then(function() {
                            return this.compileReadObjectQuery(queryInput, ignoreAccessCheck);
                        })

                        // then, query actual data from DB
                        .then(function(queryData) {
                            return this.findObject(queryData, queryInput, sendToClient, allowNull);
                        });
                    },

                    findObject: function(queryData, queryInput, sendToClient, allowNull) {
                        var model = this.getModel();
                        console.assert(model && model.find,
                            '`getModel` did not return a valid Sequelize model.');

                        // run DB query and return POD
                        return model.findOne(queryData)
                        .bind(this)
                        .then(function(resultRow) {
                            if (!resultRow) {
                                if (!allowNull) {
                                    return Promise.reject(['dataprovider.error.object.notFound', queryInput]);
                                }
                                else {
                                    return null;
                                }
                            }
                            else {
                                return Promise.resolve(SequelizeUtil.getValuesFromRows(resultRow, queryData && queryData.include))
                                .bind(this)
                                .then(this.onQueriedObject)
                                .then(function(newObject) {
                                    if (!newObject) return null;

                                    // apply change to memory set
                                    return this.applyChange(newObject, queryInput, !sendToClient);
                                })
                                .then(this.filterReadObjects);
                            }
                        });
                    },

                    /**
                     * Query data from DB.
                     */ 
                    readObjects: function(queryInput, ignoreAccessCheck, sendToClient) {
                        return Promise.resolve()
                        .bind(this)

                        // first, get query metadata
                        .then(function() {
                            return this.compileReadObjectsQuery(queryInput, ignoreAccessCheck);
                        })

                        // then, query actual data from DB
                        .then(function(queryData) {
                            return this.findObjects(queryData, queryInput, sendToClient);
                        });
                    },

                    findObjects: function(queryData, queryInput, sendToClient) {
                        var model = this.getModel();
                        console.assert(model && model.findAll,
                            '`getModel` did not return a valid Sequelize model.');

                        if (this.hasMemorySet() && model.updatedAt) {
                            // NOTE: This is one of the single most important performance optimization in this entire code
                            var lastUpdatedAt = this._memorySet.getLastUpdatedAt(queryData);
                            if (lastUpdatedAt) {
                                // only query objects that we did not query already!
                                queryData = queryData || {};
                                queryData.where = queryData.where || {};
                                queryData.where.updatedAt = { gt: lastUpdatedAt };
                            }
                        }

                        // run DB query
                        return model.findAll(queryData)
                        .bind(this)
                        .then(function(resultRows) {
                            // get only plain data
                            //return resultRows;
                            return SequelizeUtil.getValuesFromRows(resultRows, queryData && queryData.include);
                        })
                        .map(this.onQueriedObject)

                        // wrap, call events, then return result
                        .then(function(newObjects) {
                            // apply change to memory set
                            return this.applyChanges(newObjects, queryInput, !sendToClient, queryData);
                        })
                        .then(this.filterReadObjects);
                    },


                    // ####################################################################
                    // Create, Update + Delete

                    /**
                     * Insert new object into DB
                     */
                    createObject: function(queryInput, ignoreAccessCheck, dontSendToClient) {
                        return Promise.resolve()
                        .bind(this)
                        .then(function() {
                            return this.compileCreateObjectQuery(queryInput, ignoreAccessCheck);
                        })
                        // .tap(function(queryData) {
                        //     console.error('creating: ' + queryData)
                        // })

                        // send create request to DB
                                
                        .then(this.getModel().create.bind(this.getModel()))

                        .then(SequelizeUtil.getValuesFromRows)
                        .bind(this)
                        .then(this.onCreateObject)
                        .then(function(newObj) {
                            // update caches
                            return this.applyChange(newObj, queryInput, dontSendToClient);
                        });
                    },

                    // findOrCreateObject: function(options, queryInput) {
                    //     return this.getModel().findOrCreate(options)
                    //     .then(SequelizeUtil.getValuesFromRows)
                    //     .bind(this)
                    //     .then(this.onCreateObject)
                    //     .then(function(newObj) {
                    //         // update Host + Client memory sets
                    //         return this.applyChange(newObj, queryInput, dontSendToClient);
                    //     });
                    // },

                    /**
                     * Update object in DB
                     * TODO: Add more safety checks to prevent updates sent to DB to affect more than the intended objects.
                     *      We can do so, e.g., by making sure that the given selector must match to a unique index.
                     */
                    updateObject: function(queryInput, ignoreAccessCheck, dontSendToClient) {
                        //console.error(queryInput);
                        
                        return Promise.resolve()
                        .bind(this)
                        .then(function() {
                            return this.compileUpdateObjectQuery(queryInput, ignoreAccessCheck);
                        })
                        .then(function(objectUpdateData) {
                            if (!objectUpdateData) {
                                return Promise.reject(makeError('error.invalid.request'));
                            }

                            var objValues = objectUpdateData.values;
                            var selector = objectUpdateData.selector;
                            var idGetter = this._dataProviderDescriptor.idGetter;

                            var id = idGetter(objValues) || (selector && selector.where && idGetter(selector.where));
                            if (!selector || !selector.where) {
                                // if no where is given, look up id
                                if (isNaNOrNull(id)) {
                                    return Promise.reject(makeError('error.invalid.request', 'missing or invalid id in `updateObject` for DataProvider ' + this.name));
                                }

                                selector = selector || {};
                                selector.where = selector.where || {};
                                selector.where[this._dataProviderDescriptor.idProperty] = id;
                            }

                            // update things in DB
                            return this.getModel().update(objValues, selector)
                            .bind(this)
                            .spread(function(affectedRows) {
                                // update memory sets
                                if (id) {
                                    this._dataProviderDescriptor.idSetter(objValues, id);   // make sure, id is set (if it was not in values, but only in selector)
                                    // var origObj = this.byId[id];
                                    // if (origObj) {
                                        // we might not actually have updated anything
                                        // match where against origObj
                                        // TODO: This only works for trivial where statements...

                                        // for (var propName in selector.where) {
                                        //     var prop = selector.where[propName];
                                        //     if (origObj[propName] !== prop) {
                                        //         // object did not match
                                        //         console.warn('object did not match. Difference in: ' + propName);
                                        //         return;
                                        //     }
                                        // }
                                    // }

                                    if (affectedRows) {
                                        this.applyChange(objValues, queryInput, dontSendToClient);
                                    }
                                }
                                else {
                                    // could not update memory set
                                    if (this.hasMemorySet()) {
                                        this.Tools.logWarn('Cannot update memory set for object in DataProvider `' + this.name + 
                                            '` without id: ' + objValues);
                                    }
                                }
                            });
                        });
                    },

                    /**
                     * Delete object from DB
                     * WARNING: BE EXTREMELY CAREFUL WITH THIS FUNCTION.
                     *      If not handled correctly, it might accidentally delete a lot more than we wanted.
                     */
                    deleteObject: function(queryInput, ignoreAccessCheck, dontSendToClient) {
                        return Promise.resolve()
                        .bind(this)
                        .then(function() {
                            return this.compileDeleteObjectQuery(queryInput, ignoreAccessCheck);
                        })
                        .then(function(objId) {
                            //var selector = objectDeleteData.selector;

                            if (isNaNOrNull(objId)) {
                                return Promise.reject(makeError('error.internal', '`compileDeleteObjectQuery` did not return an id for DataProvider ' + this.name));
                            }

                            var selector = { where: {} };
                            selector.where[this._dataProviderDescriptor.idProperty] = objId;

                            // send query to DB
                            return this.getModel().destroy(selector)
                            .bind(this)
                            .tap(function() {
                                // update memory sets
                                if (objId) {
                                    this.applyRemove(objId, dontSendToClient);
                                }
                            });
                        });
                    },
                });     // DataProviderEndpoint
            },      // ctor

            isModel: function(obj) {
                return SequelizeUtil.isModel(obj);
            },

            Private: {
                __ctor: function() {
                },

                /**
                 * The min role of users to access data associated of any DataProvider.
                 */
                getMinRole: function() {
                    return Shared.AppConfig.getValue('minAccessRoleId');
                }
            },
            
            /**
             * Public commands can be directly called by the client
             */
            Public: {
                fetchObject: function(dataProviderName, queryInput) {
                    var dataProvider = this.getDataProvider(dataProviderName);
                    if (!dataProvider) {
                        console.warn('Invalid dataProviderName for `fetchObject`: ' + dataProviderName);
                        return Promise.reject(makeError('error.invalid.request'));
                    }
                    else if (!this.Instance.User.hasRole(this.getMinRole())) {
                        return Promise.reject('error.invalid.permissions');
                    }
                    else {
                        // query object and send back to client
                        return dataProvider.readObject(queryInput);
                    }
                },

                fetchObjects: function(dataProviderName, queryInput, since) {
                    var dataProvider = this.getDataProvider(dataProviderName);

                    if (!dataProvider) {
                        console.warn('Invalid dataProviderName for `fetchObjects`: ' + dataProviderName);
                        return Promise.reject(makeError('error.invalid.request'));
                    }
                    else if (!this.Instance.User.hasRole(this.getMinRole())) {
                        return Promise.reject('error.invalid.permissions');
                    }
                    else {
                        // query objects and send newest additons back to client
                        return dataProvider.readObjects(queryInput)
                        .then(function(newObjects) {
                            if (this.hasMemorySet()) {
                                return this.getObjectsNowSince(queryInput, false, since && new Date(since));
                            }
                            else {
                                // the queries objects are all matching objects
                                return newObjects;
                            }
                        });
                    }
                },

                createObject: function(dataProviderName, queryInput) {
                    var dataProvider = this.getDataProvider(dataProviderName);

                    if (!dataProvider) {
                        console.warn('Invalid dataProviderName for `createObject`: ' + dataProviderName);
                        return Promise.reject(makeError('error.invalid.request'));
                    }
                    else if (!this.Instance.User.hasRole(this.getMinRole())) {
                        return Promise.reject('error.invalid.permissions');
                    }
                    else {
                        // createObject
                        return dataProvider.createObject(queryInput, false, false)
                        .then(function(newObject) {
                            // only send back new object's id
                            var newId = dataProvider._dataProviderDescriptor.idGetter.call(dataProvider, newObject);
                            return newId;
                        });
                    }
                },

                updateObject: function(dataProviderName, queryInput) {
                    var dataProvider = this.getDataProvider(dataProviderName);

                    if (!dataProvider) {
                        console.warn('Invalid dataProviderName for `updateObject`: ' + dataProviderName);
                        return Promise.reject(makeError('error.invalid.request'));
                    }
                    else if (!this.Instance.User.hasRole(this.getMinRole())) {
                        return Promise.reject('error.invalid.permissions');
                    }
                    else {
                        // updateObject
                        return dataProvider.updateObject(queryInput, false, false);
                    }
                },

                deleteObject: function(dataProviderName, queryInput) {
                    var dataProvider = this.getDataProvider(dataProviderName);

                    if (!dataProvider) {
                        console.warn('Invalid dataProviderName for `deleteObject`: ' + dataProviderName);
                        return Promise.reject(makeError('error.invalid.request'));
                    }
                    else if (!this.Instance.User.hasRole(this.getMinRole())) {
                        return Promise.reject('error.invalid.permissions');
                    }
                    else {
                        // deleteObject
                        return dataProvider.deleteObject(queryInput, false, false);
                    }
                }
            },
        };
    }),
    
    
    /**
     * Everything defined in `Client` lives only in the client.
     *
     */
    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        var ThisComponent;

        return {
            __ctor: function() {
                ThisComponent = this;

                // ################################################################################################
                // Client-side DataProvider endpoint implementation

                this.DataProviderEndpoint = squishy.extendClass(this.DataProviderEndpointBase, function(dataProviderName, dataProviderDescriptor) {
                    // ctor
                    this._super(dataProviderName, dataProviderDescriptor, true);
                }, {
                    // methods

                    applyChange: function(object, queryInput) {
                        if (object) {
                            return this.applyChanges([object], queryInput)[0];
                        }
                        return null;
                    },

                    /**
                     * This is likely to grow differently from the internal `_applyChanges` function.
                     * In the future, it will probably provide additional checks and flavors.
                     */
                    applyChanges: function(newData, queryInput) {
                        return this._applyChanges(newData, queryInput);
                    },

                    /**
                     * Check DB for updates, then return objects matching the given input
                     */
                    getObjects: function(queryInput, ignoreAccessCheck) {
                        // re-fetch newest objects from DB
                        return this.readObjects(queryInput, ignoreAccessCheck)
                        .then(function(newObjects) {
                            // TODO: Call getObjectsNow
                            return newObjects;
                        });
                    },

                    /**
                     * Read single object from Host.
                     * NOTE: `id` must correspond to `idGetter` or `idProperty` of the DataProvider declaration.
                     */ 
                    readObject: function(queryInput) {
                        return this.Instance.DataProvider.host.fetchObject(this.name, queryInput)
                        .bind(this)
                        .then(function(object) {
                            // add array of objects
                            return this.applyChange(object, queryInput);
                        })
                        .catch(function(err) {
                            err = err || ['dataprovider.error.object.notFound', queryInput];
                            this.onError(err);
                        });
                    },

                    /**
                     * Read one or more objects from Host.
                     */
                    readObjects: function(queryInput) {
                        // fire event
                        this.events.sendingReadQueryToHost.fire(queryInput);

                        // TODO: In order to use `since` here, we need the server's updatedAt for the given translated queryData
                        //      If we go by queryInput instead of queryData, we will end up missing data,
                        //      in case that compileReadObjectsQuery is not time-independent.

                        // TODO: Also, we cannot rely on updatedAt since it does not change when associations are updated

                        // TODO: Deletions also need to be catched

                        //var since = this._memorySet.getLastUpdatedAt(queryInput);
                        var since = null;

                        // get objects from server
                        // currently, this is: All objects matching the query, even the already cached ones
                        return this.Instance.DataProvider.host.fetchObjects(this.name, queryInput, since)
                        .bind(this)
                        .then(function(objects) {
                            return this._applyChanges(objects, queryInput);
                        })
                        .catch(function(err) {
                            err = err || ['dataprovider.error.objects.notFound', queryInput];
                            this.onError(err);
                        });
                    },


                    // ################################################################################################
                    // Create, Update, Delete

                    /**
                     * Send creation request to host.
                     */
                    createObject: function(queryInput) {
                        var newObj = queryInput;
                        return this.Instance.DataProvider.host.createObject(this.name, newObj)
                        .bind(this)
                        .then(function(newObjId) {
                            // set id
                            this._dataProviderDescriptor.idSetter(newObj, newObjId);

                            // add to cache + return
                            return this.applyChange(newObj);
                        }.bind(this));
                    },

                    /**
                     * Send update request to host.
                     * Only sends shallow version of object, ignores nested object properties.
                     */
                    updateObject: function(_queryInput) {
                        // ignore nested object properties for now
                        var queryInput = _.clone(_queryInput, function(value) {
                            if (!_.isObject(value)) {
                                return _.clone(value);
                            }
                        });

                        var id = this._dataProviderDescriptor.idGetter(_queryInput);
                        var origObj = null;
                        var obj = this.getObjectNowById(id);
                        if (obj && obj !== _queryInput) {
                            // if an id is given and the given update is not the object itself, apply changes
                            origObj = _.clone(obj);
                            console.assert(origObj, '`updateObject` called with unused id: ' + id);
                            this.applyChange(queryInput);
                        }

                        return this.Instance.DataProvider.host.updateObject(this.name, queryInput)
                        .bind(this)
                        .then(function() {
                            // update succeeded
                        })
                        .catch(function(err) {
                            if (origObj) {
                                // update failed -> rollback
                                this.applyChange(origObj);
                            }

                            return Promise.reject(err);
                        });
                    },

                    /**
                     * Send delete request to host.
                     */
                    deleteObject: function(objectOrId, queryInput) {
                        var id;
                        if (isNaNOrNull(objectOrId)) {
                            // argument is not a number: We assume object is given
                            // lookup id
                            id = this._dataProviderDescriptor.idGetter(objectOrId)
                        }
                        else {
                            // argument is a number: We assume, id is given
                            id = objectOrId;
                        }

                        // apply changes right away
                        var origObj = this.removeFromCache(objectOrId);
                        console.assert(origObj, '`deleteObject` called with invalid objectOrId: ' + objectOrId)

                        // send request to host
                        return this.Instance.DataProvider.host.deleteObject(this.name, queryInput || id)
                        .bind(this)
                        .then(function() {
                            // deletion succeeded
                        })
                        .catch(function(err) {
                            // deletion failed -> rollback
                            this.applyChange(origObj);

                            return Promise.reject(err);
                        });
                    },

                    
                    // ################################################################################################
                    // Properly notify listeners

                    _notifyAddedObjectActiveComponents: function(obj) {
                        ThisComponent.currentlyActiveComponents.forEach(function(component) {
                            var settings = component.dataBindings && 
                                component.dataBindings[this.name];
                            if (settings) {
                                if (settings.onAddedObject) {
                                    settings.onAddedObject(obj);
                                }
                            }
                        }.bind(this));
                    },

                    _notifyChangedObjectActiveComponents: function(obj) {
                        ThisComponent.currentlyActiveComponents.forEach(function(component) {
                            var settings = component.dataBindings && 
                                component.dataBindings[this.name];
                            if (settings) {
                                if (settings.onChangedObject) {
                                    settings.onChangedObject(obj);
                                }
                            }
                        }.bind(this));
                    },

                    _notifyRemovedObjectActiveComponents: function(obj) {
                        ThisComponent.currentlyActiveComponents.forEach(function(component) {
                            var settings = component.dataBindings && 
                                component.dataBindings[this.name];
                            if (settings) {
                                if (settings.onRemovedObject) {
                                    settings.onRemovedObject(obj);
                                }
                            }
                        }.bind(this));
                    },
                });
            },


            // ################################################################################################
            // Client-side DataProvider initialization

            initClient: function() {
                this.initDataProviders();
            },

            onNewComponent: function(component) {
                this._autoInstallComponentDataProviders(component);
                this._installDataProviderEventHandlers(component);

                this._installDataBindings(component);
            },


            // ################################################################################################
            // Client-side DataProvider data-binding

            _installDataBindings: function(component) {
                this.currentlyActiveComponents = [];

                // declare all related component data
                //      (increase chances of monomorphism in related call-sites)
                component.dataBindings = component.dataBindings || null;
                component.refreshData = component.refreshData || null;
                component.refreshPaused = false;


                // register handlers for dataBindings
                if (component.dataBindings) {
                    if (component.setupUI) {
                        // TODO: Don't touch UI code here! No clear separation of concerns...

                        // it's a UI component
                        component.onDataUpdate = component.onDataUpdate || function(data) {
                            // update view
                            this.ui.invalidateView();
                        };
                        component.onDataUpdateFailed = component.onDataUpdateFailed || function(err) {
                            // handle error
                            this.ui.handleError(err);
                        };
                    }

                    for (var dataProviderName in component.dataBindings) {
                        var settings = component.dataBindings[dataProviderName];
                        var query = settings && settings.compileReadQuery;
                        settings._dataProvider = ThisComponent.getDataProvider(dataProviderName);
                        console.assert(settings._dataProvider,
                            'Invalid DataProvider name `' + dataProviderName + '` in `' + component + '.dataBindings`.');

                        settings.compileReadQuery = query instanceof Function && query || function() {
                            return this;
                        }.bind(query || null);
                    }
                }

                component.onDataUpdate = component.onDataUpdate && component.onDataUpdate.bind(component) || null;
                component.onDataUpdateFailed = component.onDataUpdateFailed && component.onDataUpdateFailed.bind(component) || null;
            },

            /**
             * This is currently called on page components when they are activated.
             * Only active page components should enable data binding.
             *
             * TODO: Eventually, this needs to be further modulized so only "currently visible" data is properly bound
             * to reduce overhead.
             */
            startComponentDataBinding: function(component) {
                if (!component.refreshData && 
                    !component.dataBindings) return;

                ThisComponent._refreshComponentData(component);
            },

            _refreshComponentData: function(component) {
                this.currentlyActiveComponents.push(component);

                var minRefreshDelay = 300;
                var delay = component.refreshDelay || Instance.AppConfig.getValue('defaultPageRefreshDelay');
                if (isNaN(delay) || delay < minRefreshDelay) {
                    // sanity check
                    console.error('`refreshDelay` too fast for component: ' + component);
                    delay = minRefreshDelay;
                }
                
                component._refreshTimer = setTimeout(function() {
                    Promise.resolve()
                    .then(function() {
                        if (!component.refreshPaused) {
                            return ThisComponent._refreshComponentDataNow(component);
                        }
                    })
                    .finally(function() {
                        // repeat
                        ThisComponent._refreshComponentData(component);
                    });
                }, delay);

                ThisComponent._refreshComponentDataNow(component);

                //return component.refreshData();
            },

            _refreshComponentDataNow: function(component) {
                var promises = [];
                if (component.refreshData) {
                    promises.push(component.refreshData());
                }
                if (component.dataBindings) {
                    for (var dataProviderName in component.dataBindings) {
                        var settings = component.dataBindings[dataProviderName];
                        var queryInput = settings.compileReadQuery();
                        var promise = settings._dataProvider.readObjects(queryInput);
                        promises.push(promise);
                    }
                }

                var promise = Promise.all(promises);
                if (component.onDataUpdate) {
                    promise = promise.then(component.onDataUpdate);
                }
                if (component.onDataUpdateFailed) {
                    promise = promise.catch(component.onDataUpdateFailed);
                }
                return promise;
            },

            stopComponentDataBinding: function(component) {
                _.remove(this.currentlyActiveComponents, component);

                // disable running timer(s)
                if (component._refreshTimer) {
                    clearTimeout(component._refreshTimer);
                    component._refreshTimer = null;
                }
            },



            // ################################################################################################
            // Client-side DataProvider request batching

            /**
             * Request all kinds of missing data in a single batch.
             * NOTE: Only requests by id are supported.
             * NOTE 2: All data providers used here must support queries by "array of ids".
             */
            requestDataBatch: function(entries, collectIdsByDataProviderName) {
                var requestedIdsByDataProviderName = {};
                var affectedEntries = [];
                var hasDataArrived;

                function requestData(dataProviderName, id) {
                    var requestedIds = requestedIdsByDataProviderName[dataProviderName] = 
                        requestedIdsByDataProviderName[dataProviderName] || {};

                    var dataProvider = Instance.DataProvider.getDataProvider(dataProviderName);
                    if (!dataProvider) {
                        throw new Error('Invalid dataProviderName given: ' + dataProviderName);
                    }
                    if (!dataProvider.getObjectNowById(id)) {
                        // not present yet
                        requestedIds[id] = true;            // make sure, data is only fetched once
                        hasDataArrived = false;             // need to fetch data
                    }
                };

                // collect all requests
                // NOTE: Currently, we can only request objects from DataProviders, by list of ids
                for (var i = 0; i < entries.length; ++i) {
                    var entry = entries[i];
                    if (entry.hasDataArrived || entry._hasDataBeenRequested) continue;
                    
                    entry._hasDataBeenRequested = true;

                    hasDataArrived = true;                  // assume data is already there

                    collectIdsByDataProviderName(entry, requestData);

                    entry.hasDataArrived = hasDataArrived;
                    if (!hasDataArrived) {
                        affectedEntries.push(entry);
                    }
                }

                // send out all requests
                var dataRequests = [];
                for (var dataProviderName in requestedIdsByDataProviderName) {
                    var requestedIds = requestedIdsByDataProviderName[dataProviderName];
                    var dataProvider = this.getDataProvider(dataProviderName);
                    var idProperty = dataProvider._dataProviderDescriptor.idProperty;
                    var requestInput = {};
                    requestInput[idProperty] = Object.keys(requestedIds);

                    // send out request
                    dataRequests.push(dataProvider.readObjects(requestInput));
                }

                return Promise.all(dataRequests)
                .then(function(responses) {
                    // data has now arrived!
                    for (var i = 0; i < affectedEntries.length; ++i) {
                        var entry = affectedEntries[i];
                        entry.hasDataArrived = true;
                    };
                });
            },


            // ################################################################################################
            // Client-side DataProvider Public methods

            Public: {
                /**
                 * Host sent changed data.
                 */
                applyChanges: function(dataProviderName, objects) {
                    var dataProvider = this.getDataProvider(dataProviderName);
                    if (!dataProvider) {
                        console.error('Invalid argument `dataProviderName` for `applyChanges` (DataProvider does not exist): ' + dataProviderName);
                        return;
                    }
                    
                    //console.log(dataProviderName + ' - update: ' + squishy.objToString(objects));
                    dataProvider._applyChanges(objects);
                },

                removeFromCachePublic: function(dataProviderName, objectId) {
                    var dataProvider = this.getDataProvider(dataProviderName);
                    if (!dataProvider) {
                        console.error('Invalid argument `dataProviderName` for `removeFromCache` (DataProvider does not exist): ' + dataProviderName);
                        return;
                    }

                    dataProvider.removeFromCache(objectId);
                }
            }
        };
    })
});