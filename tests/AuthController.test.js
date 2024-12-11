import { expect } from 'chai';
import chai from 'chai';
import chaiHttp from 'chai-http';
import app from '../../server';
import testHelper from '../utils/test.helper';

chai.use(chaiHttp);

describe('AuthController', () => {
  describe('GET /connect', () => {
    it('should authenticate user', async () => {
      const token = await testHelper.getAuthToken();
      expect(token).to.be.a('string');
    });

    it('should fail with wrong credentials', async () => {
      const res = await chai.request(app)
        .get('/connect')
        .auth('wrong@email.com', 'wrongpass');
      expect(res).to.have.status(401);
    });
  });

  describe('GET /disconnect', () => {
    it('should disconnect user', async () => {
      const token = await testHelper.getAuthToken();
      const res = await chai.request(app)
        .get('/disconnect')
        .set('X-Token', token);
      expect(res).to.have.status(204);
    });
  });

  describe('GET /users/me', () => {
    it('should return user info', async () => {
      const token = await testHelper.getAuthToken();
      const res = await chai.request(app)
        .get('/users/me')
        .set('X-Token', token);
      expect(res).to.have.status(200);
      expect(res.body).to.have.property('email');
    });
  });
});
