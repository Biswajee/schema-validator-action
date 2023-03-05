import * as core from '@actions/core';
import * as github from '@actions/github';

const exec = async (): Promise<void> => {
    try {
        const schemaFileUrl: string = core.getInput('schema-url');
        console.log(`Obtaining the schema from the url: '${schemaFileUrl}'`);
        
        // Get the JSON webhook payload for the event that triggered the workflow
        const payload = JSON.stringify(github.context.payload, undefined, 2)
        console.log(`The event payload is: ${payload}`);
      } catch (err: any) {
        core.setFailed(err.message);
      }
    };
  
  export default exec;
  
  // Do not execute the script if NODE_ENV is set to test
  // because we'll probably expect to run our test scripts
  if (process.env.NODE_ENV !== 'test') {
    exec().then();
  }