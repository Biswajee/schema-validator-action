import * as core from '@actions/core';
import * as tmp from 'tmp';
import fs from 'fs';
import fse from 'fs-extra';
import path from 'path';
import Ajv, { JSONSchemaType } from 'ajv';

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
  return fetch(downloadUrl).then((response) => response.json());
};

// Decide what to do based on the input parameters
const decideInputResources = async (tmpDir: string): Promise<void> => {
  const {
    schemaFileUrl,
    jsonFileUrl,
    schemaFilePath,
    jsonFilePath,
    runnerTemporaryPath,
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
      path.join(runnerTemporaryPath, tmpDir, 'schema.json'),
      response,
    );

    response = downloadFile(jsonFileUrl);
    fs.writeFileSync(
      path.join(runnerTemporaryPath, tmpDir, 'data.json'),
      response,
    );
  }

  // If the schemaFilePath and jsonFilePath are both defined
  else if (schemaFilePath !== undefined && jsonFilePath !== undefined) {
    console.log(
      `Using the 'schema-path' and the 'json-path' parameters for schema validation.`,
    );

    console.log(`Copying schema data to the temporary folder: ${tmpDir}`);
    fse.copy(schemaFilePath, path.join(runnerTemporaryPath, tmpDir));

    console.log(`Copying json data to the temporary folder: ${tmpDir}`);
    fse.copy(jsonFilePath, path.join(runnerTemporaryPath, tmpDir));
  }

  // If the schemaFileUrl and jsonFilePath are both defined
  else if (schemaFileUrl !== undefined && jsonFilePath !== undefined) {
    console.log(
      `Using the 'schema-url' and the 'json-path' parameters for schema validation.`,
    );

    console.log(`Downloading schema data to the temporary folder: ${tmpDir}`);

    let response = await downloadFile(schemaFileUrl);
    fs.writeFileSync(
      path.join(runnerTemporaryPath, tmpDir, 'schema.json'),
      response,
    );

    console.log(`Copying json data to the temporary folder: ${tmpDir}`);
    fse.copy(jsonFilePath, path.join(runnerTemporaryPath, tmpDir));
  }

  // If the schemaFilePath and jsonFileUrl are both defined
  else if (schemaFilePath !== undefined && jsonFileUrl !== undefined) {
    console.log(
      `Using the 'schema-path' and the 'json-url' parameters for schema validation.`,
    );

    console.log(`Copying schema data to the temporary folder: ${tmpDir}`);
    fse.copy(schemaFilePath, path.join(runnerTemporaryPath, tmpDir));

    console.log(`Downloading json data to the temporary folder: ${tmpDir}`);
    let response = await downloadFile(jsonFileUrl);
    fs.writeFileSync(
      path.join(runnerTemporaryPath, tmpDir, 'data.json'),
      response,
    );
  } else {
    throw Error(
      'Input parameters are not properly defined. Please read the documentation to understand more.',
    );
  }
};

// Evaluate the JSON file against the schema
const evaluate = (tmpDir: string) => {
  const ajv = new Ajv();

  interface MyData {
    foo: number;
    bar?: string;
  }

  const schema: JSONSchemaType<MyData> = {
    type: 'object',
    properties: {
      foo: { type: 'integer' },
      bar: { type: 'string', nullable: true },
    },
    required: ['foo'],
    additionalProperties: false,
  };

  // validate is a type guard for MyData - type is inferred from schema type
  const validate = ajv.compile(schema);

  // or, if you did not use type annotation for the schema,
  // type parameter can be used to make it type guard:
  // const validate = ajv.compile<MyData>(schema)

  const data = {
    foo: 1,
    bar: 'abc',
  };

  console.log(`The temporary directory is : ${tmpDir}`);

  if (validate(data)) {
    // data is MyData here
    console.log(data.foo);
  } else {
    console.log(validate.errors);
  }
};

const exec = async (): Promise<void> => {
  try {
    const { runnerTemporaryPath } = getInputs();

    const tmpDir = tmp.dirSync({ dir: runnerTemporaryPath }).name;
    fs.mkdirSync(path.join(runnerTemporaryPath, tmpDir), { recursive: true });

    decideInputResources(tmpDir);
    evaluate(tmpDir);
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
