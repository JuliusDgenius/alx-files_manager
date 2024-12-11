import { expect } from 'chai';
import chai from 'chai';
import chaiHttp from 'chai-http';
import app from '../../server';

chai.use(chaiHttp);

describe('AppController', () => {
  describe('GET /status', () => {
    it('should return status', async () => {
      const res = await chai.request(app).get('/status');
      expect(res).to.have.status(200);
      expect(res.body).to.deep.equal({ redis: true, db: true });
    });
  });

  describe('GET /stats', () => {
    it('should return stats', async () => {
      const res = await chai.request(app).get('/stats');
      expect(res).to.have.status(200);
      expect(res.body).to.have.property('users');
      expect(res.body).to.have.property('files');
    });
  });
});
