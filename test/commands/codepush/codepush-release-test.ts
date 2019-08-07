import * as Nock from "nock";
import * as Temp from "temp";
import * as Sinon from "sinon";
import * as util from "util";
import { expect } from "chai";
import CodePushReleaseCommand from "../../../src/commands/codepush/release";
import * as updateContentsTasks from "../../../src/commands/codepush/lib/update-contents-tasks";
import { getFakeParamsForRequest, createFile, getCommandArgsForReleaseCommand, FakeParamsForRequests, nockPlatformRequest, getLastFolderForSignPath, releaseUploadResponse, setMetadataResponse } from "./utils";
import { CommandArgs } from "../../../src/util/commandline";

describe.only("CodePush release tests", () => {
  const tmpFolderPath = Temp.mkdirSync("releaseTest");
  const releaseFileName = "releaseBinaryFile";
  const releaseFileContent = "Hello World!";

  const fakeParamsForRequests: FakeParamsForRequests = getFakeParamsForRequest();

  let nockedApiGatewayRequests: Nock.Scope;
  let nockedFileUploadServiceRequests: Nock.Scope;
  let stubbedSign: Sinon.SinonStub;

  beforeEach(() => {
    nockedApiGatewayRequests = Nock(fakeParamsForRequests.host)
      .get(`/${fakeParamsForRequests.appVersion}/apps/${fakeParamsForRequests.userName}/${fakeParamsForRequests.appName}/deployments/Staging`)
      .reply(200, (uri: any, requestBody: any) => { return {}; });

    nockedFileUploadServiceRequests = Nock(releaseUploadResponse.upload_domain)
      .post(`/upload/set_metadata/${releaseUploadResponse.id}`)
      .query(true)
      .reply(200, setMetadataResponse);

    nockedFileUploadServiceRequests
      .post(`/upload/upload_chunk/${releaseUploadResponse.id}`)
      .query({
        token: releaseUploadResponse.token,
        block_number: 0
      })
      .reply(200, {
        error: false,
        chunk_num: 0,
        error_code: "None",
        state: "Done"
      });

    nockedFileUploadServiceRequests
      .post(`/upload/finished/${releaseUploadResponse.id}`)
      .query({
        token: releaseUploadResponse.token
      })
      .reply(200, {
        error: false,
        chunk_num: 0,
        error_code: "None",
        state: "Done"
      });

    stubbedSign = Sinon.stub(updateContentsTasks, "sign");
  });

  afterEach(() => {
    Nock.cleanAll();
    stubbedSign.restore();
  });

  describe("CodePush signed release", () => {
    describe("CodePush path generation", () => {
      it.only("CodePush path generation for React-Native with private key", async () => {
        // Arrange
        const releaseFilePath = createFile(tmpFolderPath, releaseFileName, releaseFileContent);
        nockPlatformRequest("React-Native", fakeParamsForRequests, nockedApiGatewayRequests);
        nockedApiGatewayRequests
          .post(`/${fakeParamsForRequests.appVersion}/apps/${fakeParamsForRequests.userName}/${fakeParamsForRequests.appName}/deployments/Staging/uploads`)
          .reply(200, releaseUploadResponse);

        const args: CommandArgs = getCommandArgsForReleaseCommand(["-c", releaseFilePath, "-k", "fakePrivateKey.pem"], fakeParamsForRequests);

        // Act
        const testRelaseSkeleton = new CodePushReleaseCommand(args);
        const result = await testRelaseSkeleton.execute();

        // Assert
        console.dir(util.inspect(result));
        expect(result.succeeded).to.be.true;
        const lastFolderForSignPath = getLastFolderForSignPath(stubbedSign);
        expect(lastFolderForSignPath).to.eql("CodePush", "Last folder in path should be 'CodePush'");
        nockedApiGatewayRequests.done();
      });

      it("CodePush path generation for Cordova with private key", async () => {
        // Arrange
        const releaseFilePath = createFile(tmpFolderPath, releaseFileName, releaseFileContent);
        nockPlatformRequest("Cordova", fakeParamsForRequests, nockedApiGatewayRequests);
        const args: CommandArgs = getCommandArgsForReleaseCommand(["-c", releaseFilePath, "-k", "fakePrivateKey.pem"], fakeParamsForRequests);

        // Act
        const testRelaseSkeleton = new CodePushReleaseCommand(args);
        const result = await testRelaseSkeleton.execute();

        // Assert
        expect(result.succeeded).to.be.true;
        const lastFolderForSignPath = getLastFolderForSignPath(stubbedSign);
        expect(lastFolderForSignPath).to.not.eql("CodePush", "Last folder in path shouldn't be 'CodePush'");
        nockedApiGatewayRequests.done();
      });

      it("CodePush path generation for Electron with private key", async () => {
        // Arrange
        const releaseFilePath = createFile(tmpFolderPath, releaseFileName, releaseFileContent);
        nockPlatformRequest("Electron", fakeParamsForRequests, nockedApiGatewayRequests);
        const args: CommandArgs = getCommandArgsForReleaseCommand(["-c", releaseFilePath, "-k", "fakePrivateKey.pem"], fakeParamsForRequests);

        // Act
        const testRelaseSkeleton = new CodePushReleaseCommand(args);
        const result = await testRelaseSkeleton.execute();

        // Assert
        expect(result.succeeded).to.be.true;
        const lastFolderForSignPath = getLastFolderForSignPath(stubbedSign);
        expect(lastFolderForSignPath).to.not.eql("CodePush", "LastFolder in path shouldn't be 'CodePush'");
        nockedApiGatewayRequests.done();
      });
    });
  });
});
