import * as core from '@actions/core';
import * as tmp from 'tmp';
import fs from 'fs';
import fse from 'fs-extra';
import path from 'path';
import axios from 'axios';
import Ajv from 'ajv';

tmp.setGracefulCleanup();

// Get the relevant information from the user and the agent
const getInputs = () => ({
  schemaFileUrl: core.getInput('schema-url'),
  jsonFileUrl: core.getInput('json-url'),
  schemaFilePath: core.getInput('schema-path'),
  jsonFilePath: core.getInput('json-path'),
  runnerName: core.getInput('runner.name'),
  runnerOS: core.getInput('runner.os'),
  runnerCachePath: core.getInput('runner.tool_cache'),
  runnerTemporaryPath: core.getInput('runner.temp'),
});

// Helper function to download a file
const downloadFile = (downloadUrl: string): Promise<any> => {
  return axios.get(downloadUrl).then((response) => response.data);
};

// Decide what to do based on the input parameters
const decideInputResources = async (tmpDir: string): Promise<void> => {
  const {
    schemaFileUrl,
    jsonFileUrl,
    schemaFilePath,
    jsonFilePath,
  } = getInputs();

  // If the schemaFileUrl and jsonFileUrl are both defined
  if (schemaFileUrl !== undefined && jsonFileUrl !== undefined) {
    console.log(
      `Using the 'schema-url' and the 'json-url' parameters for schema validation.`,
    );
    console.log(
      `Downloading schema and json data to the temporary folder: ${tmpDir}`,
    );

    let response = await downloadFile(schemaFileUrl);
    fs.writeFileSync(
      path.join(tmpDir, 'schema.json'),
      JSON.stringify(response),
    );

    response = downloadFile(jsonFileUrl);
    fs.writeFileSync(
      path.join(tmpDir, 'data.json'),
      JSON.stringify(response),
    );
  }

  // If the schemaFilePath and jsonFilePath are both defined
  else if (schemaFilePath !== undefined && jsonFilePath !== undefined) {
    console.log(
      `Using the 'schema-path' and the 'json-path' parameters for schema validation.`,
    );

    console.log(`Copying schema data to the temporary folder: ${tmpDir}`);
    fse.copy(schemaFilePath, tmpDir);

    console.log(`Copying json data to the temporary folder: ${tmpDir}`);
    fse.copy(jsonFilePath, tmpDir);
  }

  // If the schemaFileUrl and jsonFilePath are both defined
  else if (schemaFileUrl !== undefined && jsonFilePath !== undefined) {
    console.log(
      `Using the 'schema-url' and the 'json-path' parameters for schema validation.`,
    );

    console.log(`Downloading schema data to the temporary folder: ${tmpDir}`);

    let response = await downloadFile(schemaFileUrl);
    fs.writeFileSync(
      path.join(tmpDir, 'schema.json'),
      response,
    );

    console.log(`Copying json data to the temporary folder: ${tmpDir}`);
    fse.copy(jsonFilePath, tmpDir);
  }

  // If the schemaFilePath and jsonFileUrl are both defined
  else if (schemaFilePath !== undefined && jsonFileUrl !== undefined) {
    console.log(
      `Using the 'schema-path' and the 'json-url' parameters for schema validation.`,
    );

    console.log(`Copying schema data to the temporary folder: ${tmpDir}`);
    fse.copy(schemaFilePath, tmpDir);

    console.log(`Downloading json data to the temporary folder: ${tmpDir}`);
    let response = await downloadFile(jsonFileUrl);
    fs.writeFileSync(
      path.join(tmpDir, 'data.json'),
      response,
    );
  } else {
    throw Error(
      'Input parameters are not properly defined. Please read the documentation to understand more.',
    );
  }
};

// Evaluate the JSON file against the schema
const evaluate = (tmpDir: string): boolean => {
  const ajv = new Ajv();
  console.log(`Attempting to parse the schema and data files at: ${tmpDir}`);

  const schema = JSON.parse(
    fs.readFileSync(`${tmpDir}/schema.json`, { encoding: 'utf-8' }),
  );
  const data = JSON.parse(
    fs.readFileSync(`${tmpDir}/data.json`, { encoding: 'utf-8' }),
  );

  const validate = ajv.compile(schema);

  if (validate(data)) {
    console.log(
      'Validation successful for the provided data against the provided schema 👍',
    );
    return true;
  } else {
    console.log(`Validation unsuccessful due to: ${validate.errors}`);
    return false;
  }
};

const exec = async (): Promise<void> => {
  try {
    const { runnerTemporaryPath } = getInputs();

    const tmpDir = tmp.dirSync({ dir: runnerTemporaryPath }).name;
    const workingDirectory = path.join(runnerTemporaryPath, tmpDir);
    fs.mkdirSync(workingDirectory, { recursive: true });

    await decideInputResources(workingDirectory);
    const result = evaluate(workingDirectory);
    if (!result)
      core.setFailed(
        'Data validation failed. Please check if the data is vaild!',
      );
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
