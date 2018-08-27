/* #region INIT */
const express = require('express');
const router = express.Router();
const asana = require('asana');

// Bring in asana helper
const helper = require('../../helpers/asana');

//Load webhook model
const Webhook = require('../models/Webhook');

let myTempReply = '';
// Server URL:  https://qvaliasystem.herokuapp.com/api/qvalia/webhooks/COMMAND_783353782030230 */

// This imports the myFunctions libary modules, renames asanaTaskFunction to simply "a" for easier use.
const { asanaTaskFunction: a, myOtherObjct } = require('./myFunctions');

// Import keys
const keys = require('../../config/keys');
// Create Asana Client
client = asana.Client.create().useAccessToken(keys.distanskraftToken);
client.users.me().then(me => {
  //console.log(me);
});

/* COMMENTS OF CODE, SNIPPETS AND STUFF BELOW */
/* DELAY FUNCTION CALL WITH MS
  let husse = task.then(responses => {
    console.log('TASK FFS: ', responses.name);
    setTimeout(function() {
      return responses;
    }, 2000);
  });
*/

/* #endregion INIT */

/* #region WEBHOOKS_START: */

//@ route  POST api/ecokraft/subscribe/event
//@ desc   Route that starts to subscribe on events in an asana project
//@ desc   keys: asanaProjectId, workspaceId, projectType
//@ access Public
router.post('/subscribe/event', (req, res) => {
  const checkAsanaForWebhook = (workspaceId, asanaProjectId) => {
    const target = `https://qvaliasystem.herokuapp.com/api/qvalia/event/webhook/${asanaProjectId}`;
    client.webhooks
      .getAll(workspaceId, {
        resource: asanaProjectId
      })
      .then(hooksList => {
        console.log(hooksList);
        // Check Asana if Hook Already exist on same target
        // then return the already existing hook otherwise create new
        var resource = asanaProjectId;

        var alreadyExistingHook = hooksList.data.find(hook => {
          return hook.target == target;
        });

        if (alreadyExistingHook) {
          //Log
          console.log(`Hook Already exists for ${resource}:${target}`);

          return alreadyExistingHook;
        } else {
          return client.webhooks.create(resource, target);
        }
      })
      .then(hook => {
        res.json(hook);
      })
      .catch(err => {
        res.json(err.value);
      });
  };

  //Check in db if hook already exists
  let errors = {};
  Webhook.findOne({ asanaProjectId: req.body.asanaProjectId })
    .then(asanaProjectId => {
      if (asanaProjectId) {
        //Function to check if the subscription exists at asana
        checkAsanaForWebhook(
          asanaProjectId.workspaceId,
          asanaProjectId.asanaProjectId
        );
        //errors.asanaProjectId = 'asanaProjectId already exists';
        //return res.status(400).json(errors);
      } else {
        const newWebhook = new Webhook({
          asanaProjectId: req.body.asanaProjectId,
          workspaceId: req.body.workspaceId,
          projectType: req.body.projectType
        });

        newWebhook
          .save()
          .then(webhook => {
            checkAsanaForWebhook(webhook.workspaceId, webhook.asanaProjectId);
          })
          .catch(err => console.log(err));
      }
    })
    .catch(err => console.log(err));
});

//@ route  POST api/ecokraft/event/webhook/:resourceId
//@ desc   Route that recieves calls from asana
//@ desc   keys: req.body & req.params
//@ access Public
router.post('/event/webhook/:resourceId', (req, res) => {
  //console.log(req.body);
  const resourceId = req.params.resourceId;
  var events = req.body.events;

  helper.subscribeToAsanaWebhooks(events || [], resourceId).then(respList => {
    console.log('Asana Webhook Subscribe: ', respList);
    console.log('Got the promise back');
  });
  // sets and responds to the X-Hook-Secret
  res.set('X-Hook-Secret', req.headers['x-hook-secret']);
  res.status(200).json({});
});

/* #endregion WEBHOOKS_START */

/*  #region TASK_updateCustomFieldByName */

router.post('/task/updateCustomFieldByName', async (req, res) => {
  const resp = await updateCustomFieldByName(
    req.body.taskId,
    req.body.cfName,
    req.body.cfValue
  );
  //console.log('response', resp);
  res.json(resp);
});

async function updateCustomFieldByName(taskId, cfName, cfValue) {
  /* Add the below into the router.post section: 
    const resp = await updateCustomFieldByName(
    req.body.taskId,
    req.body.cfName,
    req.body.cfValue
  );
  //console.log('response', resp);
  res.json(resp);
  */

  // Pull the task from Asana.
  let task = await a.getTaskById(taskId);

  if (task.toString() != 'Error: Invalid Request') {
    // Storage for Custom Field Id.
    let cfId = '';

    // Object used to send the custom fields to the Asana API
    let myCustom_field = {};

    // Filter the custom fields by name, if no hit, return error.
    return task.custom_fields.filter(function(field) {
      if (field.name === cfName) {
        if (field.type === 'text') {
          // Set the custom field id
          cfId = field.id;
          // Set the custom field object id to the incomming value.
          myCustom_field[cfId] = cfValue;
          // Update the task accordingly
          return client.tasks
            .update(task.id, {
              name: task.name,
              custom_fields: myCustom_field
            })
            .then(response => {
              return (
                'Successfully updated custom field' +
                cfName +
                ' to value ' +
                cfValue +
                ' in task ' +
                taskId +
                '.\n' +
                response
              );
            })
            .catch(err => console.log(err.value.errors));
        } else if (field.type === 'number') {
          // Set the custom field id
          cfId = field.id;
          // Set the custom field object id to the incomming value.
          myCustom_field[cfId] = cfValue;
          // Update the task accordingly
          return client.tasks
            .update(task.id, {
              name: task.name,
              custom_fields: myCustom_field
            })
            .then(response => {
              return (
                'Successfully updated custom field' +
                cfName +
                ' to value ' +
                cfValue +
                ' in task ' +
                taskId +
                '.\n' +
                response
              );
            })
            .catch(err => console.log(err.value.errors));
        } else if (field.type === 'enum') {
          field.enum_options.forEach(enum_options => {
            if (enum_options.name === cfValue) {
              // Set the custom field id
              cfId = field.id;
              // Set the custom field object id to the id which matches the incomming value.
              myCustom_field[cfId] = enum_options.id;
              // Update the task accordingly
              return client.tasks
                .update(task.id, {
                  name: task.name,
                  custom_fields: myCustom_field
                })
                .then(response => {
                  return (
                    'Successfully updated custom field' +
                    cfName +
                    ' to value ' +
                    cfValue +
                    ' in task ' +
                    taskId +
                    '.\n' +
                    response
                  );
                })
                .catch(err => console.log(err.value.errors));
            } else {
              // TODO: Error handling not working correctly. Gotta fix that for later.
              return 'ERROR 3. The requested custom field was found, but was enum and the requested update value was not in the enum list..';
            }
          });
        }
        // TODO: Error handling not working correctly. Gotta fix that for later.
      } else {
        return (
          'ERROR 2. The requested custom field ' + cfName + ' was not found.'
        );
      }
    });
  } else {
    return 'ERROR 1. No Asana task was found with ID: ' + taskId;
  }
}

/* #endregion TASK_updateCustomFieldByName */

router.post('/task/addtasktoprojectbyname', async (req, res) => {
  const resp = await addTaskToProjectByName(
    req.body.taskId,
    req.body.projectName
  );

  res.json(resp);
});

async function addTaskToProjectByName(taskId, projectName) {
  // NOT WORKING YET:
  return client.projects
    .findAll({ workspace: 542024449570027 })
    .then(function(response) {
      //console.log(response);
      response.data.forEach(project => {
        if (project.name === projectName) {
          console.log('Found project, has id: ' + project.id);

          return client.tasks
            .addProject(taskId, {
              projects: '768947507881600'
            })
            .then(response => {
              return response;
            })
            .catch(err => console.log(err.value.errors));
        }
      });
      //response.data.name.forEach(name => console.log(response.data.name));
    });
  /*
  "projects": [
        {
            "id": 768947507881600,
            "name": "1. ACCOUNTS - SE"
        },
        {
            "id": 784098616336416,
            "name": "1. ACCOUNTS - ALL"
        }
    ],
*/

  /*
  if (task.toString() != 'Error: Invalid Request') {
    // Storage for Custom Field Id.
    let cfId = '';

    // Object used to send the custom fields to the Asana API
    let myCustom_field = {};
    cfId = field.id;
    // Set the custom field object id to the incomming value.
    myCustom_field[cfId] = cfValue;

    return client.tasks
      .update(task.id, {
        name: task.name,
        projects: myProjects
      })
      .then(response => {
        return response;
      })
      .catch(err => console.log(err.value.errors));
  } else return 'ERROR 1. No Asana task was found with ID: ' + taskId;


*/
}

/* #endregion TASK_updateCustomFieldByName */

//
//
//
//
//
//
//
//
//
//
//
//
//

/* #region POST_TASK_SHOW - UPDATE TASK */
/*  TASK/UPDATE
  ____   ___  ____ _____ 
 |  _ \ / _ \/ ___|_   _|
 | |_) | | | \___ \ | |  
 |  __/| |_| |___) || |  
 |_|    \___/|____/ |_|  
                       
*/
// @route   POST /api/qvalia/update/task
// @desc    Update custom fields of tasks
// @access  Public
router.post('/task/show', (req, res) => {
  const taskId = req.body.taskId; // send taskId @params

  // Update asana task with custom field.
  client.tasks
    .update(taskId, {})

    // Define Response in function.. This is a promise returned from Asana API
    .then(response => {
      //Send the response back in a json. This is already in json format from the asana api
      res.json(response);
    })
    .catch(err => {
      //IF Error, catch the error and log to console.
      console.log(err);

      //Return also the error back to the sender.
      res.json(err);
    });
});

/* #endregion POST_TASK_SHOW */

//
//
//
//
//
//

/* #region POST_TEST_TEST1 POST TEST1*/

/*  TEST/TEST1
  ____   ___  ____ _____ 
 |  _ \ / _ \/ ___|_   _|
 | |_) | | | \___ \ | |  
 |  __/| |_| |___) || |  
 |_|    \___/|____/ |_|  
                       
*/
// @route   POST /api/qvalia/test/test1
// @desc    Used for basic testing
// @access  Public
router.post('/test/test1', (req, res) => {
  // Not required right now, but will give access to the top level task for later use.

  // Setting the variables that are required here.
  let Account, AccountSubTasks;

  //console.log('#1');
  a.getTaskById(req.body.taskId)
    .then(result => {
      //console.log('#2');
      Account = result;
      return a.getSubTasks(Account.id);
    })
    .then(result => {
      AccountSubTasks = result;
      console.log('AccountSubTasks', result);
      return Promise.resolve();
    })
    .then(result => {
      console.log('Account', Account);
      console.log('AccountSubTasks', AccountSubTasks);
      return Promise.resolve();
    })
    .then(result => {
      // MAIN CODE STARTS HERE!

      // a.getCustomFieldIdByName(Account, 'Account Name');
      let customFields =
        'customFields[' +
        a.getCustomFieldIdByName(Account, 'Account Name') +
        ']: NEW_NAME!';

      res.json(a.updateTaskCustomFields(Account, customFields));

      /*
    "custom_fields": [ {"id":783353782030230, "enum_value":null,"text":[,
*/

      /* "custom_fields": [
        {
          "id": 783353782030230,
          "name": "SYSTEM COMMAND",
          "type": "enum",
          "enum_value": null,
          "enum_options": [
              {
                  "id": 783353782030231,
                  "name": "Update Account Name",
                  "enabled": true,
                  "color": "yellow-green"
              }
          ],
          "enabled": true
      },

      */

      // Update asana task with custom field.
      client.tasks
        .update(Account.id, {
          custom_fields: customFields
        })

        // Define Response in function.. This is a promise returned from Asana API
        .then(response => {
          //Send the response back in a json. This is already in json format from the asana api
          res.json(response);
        })
        .catch(err => {
          //IF Error, catch the error and log to console.
          console.log(err);

          //Return also the error back to the sender.
          res.json(err);
        });

      /*

      // For all tasks under the Account
      for (let i = 0; i < AccountSubTasks.data.length; i++) {}

      let subtask_count = AccountSubTasks.data.length;
      let arrSubTaskIds = [];
      let arrSubTasks = [];

      res.json(cf_AccountNameId);
*7


      /*
      res.json(
        'Hej! Ville du veta nått om task: ' +
          Account.id +
          '? TASK NAME: ' +
          Account.name
      );
      */
    });
  //console.log('#3');
});

/* #endregion POST_TEST_TEST1 POST TEST1*/

/* #region POST_LOL POST LOL */
/*  LOL
  ____   ___  ____ _____ 
 |  _ \ / _ \/ ___|_   _|
 | |_) | | | \___ \ | |  
 |  __/| |_| |___) || |  
 |_|    \___/|____/ |_|  
                         

*/
router.post('/lol', (req, res) => {
  client.tasks.subtasks(req.body.taskId).then(response => {
    console.log(response);

    // For every subtask in the main task
    let arrSubTaskIds = [];
    let arrSubTasks = [];

    // For all subtasks push the task ID into the array arrSubTasks created above.
    for (let i = 0; i < response.data.length; i++) {
      client.tasks
        .update(response.data[i].id)
        .then(response => arrSubTasks.push(response));
      console.log(response);

      arrSubTaskIds[i] = response.data[i].id;
    }

    // For all subtask id's, extract the value from the selected custom field.
    for (let i = 0; i < response.data.length; i++) {
      console.log('Running the subtask loop, i = ' + i);
      client.tasks.update(arrSubTaskIds[i]).then(subTaskResponse => {
        console.log(subTaskResponse);

        /* The "asanaTaskFunction" is built below, custom made functions used in order
           to not have to repeat the code up here, and to make the code more redable. 
           The function "getCustomFieldsIdByName" requires a task object (response) 
           and a string to search the custom fields for. 
           When a match is found the custom_field id is returned to the code. 
        console.log(
          'Initiating function call to "asanaTaskFunction.getCustomFieldIdByName()".'
        );

        console.log(
          'The subtasks custom field id equals: ' +
            a.getCustomFieldIdByName(
              subTaskResponse,
              'Total Agreed Amount' //TODO: This should be changed into an incomming KEY instead.
            )
        );

        let customFieldId = '';

        customFieldId = a.getCustomFieldIdByName(
          subTaskResponse,
          'Total Agreed Amount'
        );

        let customFieldvalue = '';
        console.log(
          'The subtasks custom field value is: ' +
            a.getCustomFieldValueById(
              subTaskResponse,
              a.getCustomFieldIdByName(subTaskResponse, 'Total Agreed Amount')
            )
        );
        */

        /* Below, the two functions are used combined, the first getting the id of the custom_field
           and the second retrieving the value from the custom field with that custom_field id.*/
        customFieldvalue = a.getCustomFieldValueById(
          subTaskResponse,
          a.getCustomFieldIdByName(subTaskResponse, 'Total Agreed Amount')
        );

        console.log('CustomFieldValue = ' + customFieldvalue);
      });
    }

    if (arrSubTaskIds.length === response.data.length) {
      res.json(arrSubTaskIds);
    }
  });
});

/* #endregion POST_LOL POST LOL */

module.exports = router;
