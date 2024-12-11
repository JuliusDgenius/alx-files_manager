import { expect } from 'chai';
import chai from 'chai';
import chaiHttp from 'chai-http';
import app from '../../server';
import testHelper from '../utils/test.helper';

chai.use(chaiHttp);

describe('FilesController', () => {
  let token;
  let fileId;

  before(async () => {
    token = await testHelper.getAuthToken();
  });

  describe('POST /files', () => {
    it('should create a new file', async () => {
      const res = await testHelper.createFile(token);
      expect(res).to.have.status(201);
      fileId = res.body.id;
    });
  });

  describe('GET /files/:id', () => {
    it('should get file by id', async () => {
      const res = await chai.request(app)
        .get(`/files/${fileId}`)
        .set('X-Token', token);
      expect(res).to.have.status(200);
    });
  });

  describe('GET /files', () => {
    it('should list files with pagination', async () => {
      const res = await chai.request(app)
        .get('/files?page=0')
        .set('X-Token', token);
      expect(res).to.have.status(200);
      expect(res.body).to.be.an('array');
    });
  });

  describe('PUT /files/:id/publish', () => {
    it('should publish a file', async () => {
      const res = await chai.request(app)
        .put(`/files/${fileId}/publish`)
        .set('X-Token', token);
      expect(res).to.have.status(200);
      expect(res.body.isPublic).to.be.true;
    });
  });

  describe('PUT /files/:id/unpublish', () => {
    it('should unpublish a file', async () => {
      const res = await chai.request(app)
        .put(`/files/${fileId}/unpublish`)
        .set('X-Token', token);
      expect(res).to.have.status(200);
      expect(res.body.isPublic).to.be.false;
    });
  });

  describe('GET /files/:id/data', () => {
    it('should get file data', async () => {
      const res = await chai.request(app)
        .get(`/files/${fileId}/data`)
        .set('X-Token', token);
      expect(res).to.have.status(200);
    });

    it('should get thumbnail', async () => {
      const res = await chai.request(app)
        .get(`/files/${fileId}/data?size=500`)
        .set('X-Token', token);
      expect(res).to.have.status(200);
    });
  });
}); 