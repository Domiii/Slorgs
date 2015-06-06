/**
 * All utilities required to verify and manage users.
 * TODO: Separate Account + User management
 */
"use strict";

var NoGapDef = require('nogap').Def;


module.exports = NoGapDef.component({
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
		var lastId = 0;
        return {

            // ####################################################
            // data + data definitions

            OwnerType: squishy.makeEnum({
                All: 1,
                Group: 2,
                Individual: 3
            }),

            initBase: function() {
            },

            Private: {
            	__ctor: function() {
            		this.genTestData();
            	},

            	createLearningPathTemplate: function(templateDef) {
            		// simulate DB insertion
            		templateDef.learningPathTemplateId = ++lastId;

            		if (templateDef.TaskTemplates) {
            			var taskTemplates = templateDef.TaskTemplates;
            			//delete templateDef.TaskTemplates;

            			for (var i = 0; i < taskTemplates.length; ++i) {
            				var taskTemplate = taskTemplates[i];
            				//taskTemplate.taskTemplateId = ++lastId;
            				taskTemplate.learningPathTemplateId = templateDef.learningPathTemplateId;
            			}
            		}

            		return Promise.resolve(templateDef);
            	},

	            genTestData: function() {
	                var OwnerType = this.Shared.OwnerType;

                    // TODO: Proofs
	                this.TaskProofTypes = [{
	                	name: '',
	                	description: '',
	                	contentTypes: '',
	                	isOptional: false // TODO: really?
	                }];


	                this.TestTemplates = [{
	                    title: 'Scratch: Getting started!',
	                    description: 'hello',
	                    isEnabled: true,
	                    ownerType: OwnerType.Individual,
	                    startTime: null,
	                    endTime: null,

	                    // TODO: Who has this been assigned to? (teacher-centric)
	                    // TODO: Who may choose this path? (student self-organization + optional paths)
	                    UsersWithAccess: [],
	                    GroupsWithAccess: [],

	                    TaskTemplates: [{
	                    	taskTemplateId: 1,
	                        title: 'Task #1',
	                        description: 'Task #1 description',
	                        isRequired: true,

	                        proofTypeId: 0
	                    },{
	                    	taskTemplateId: 2,
	                        title: 'Task #2',
	                        description: 'Task #2 description',
	                        isRequired: true,

	                        proofTypeId: 0
	                    },{
	                    	taskTemplateId: 3,
	                        title: 'Task #3',
	                        description: 'Task #3 description',
	                        isRequired: true,

	                        proofTypeId: 0
	                    }],

	                    LearningPathOutcomes: [{
	                        // TODO?
	                    }]
	                }];
	            },
            }
        };
    }),

    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) {
    	return {

        };
    }),

    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        var ThisComponent;

        return {
            __ctor: function () {
                ThisComponent = this;
            },
    	};
    })
});