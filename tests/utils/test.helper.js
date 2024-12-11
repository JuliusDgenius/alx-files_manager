import chai from 'chai';
import chaiHttp from 'chai-http';
import { ObjectId } from 'mongodb';
import sha1 from 'sha1';

chai.use(chaiHttp);
const { expect } = chai;

const testHelper = {
  getAuthToken: async (email = 'bob@dylan.com') => {
    const hashedPassword = sha1('toto1234!');
    const user = {
      email,
      password: hashedPassword,
    };
    
    const res = await chai.request(app)
      .post('/users')
      .send(user);
      
    const loginRes = await chai.request(app)
      .get('/connect')
      .auth(email, 'toto1234!');
      
    return loginRes.header['x-token'];
  },
  
  createFile: async (token, fileData = {}) => {
    const defaultData = {
      name: 'test.txt',
      type: 'file',
      data: Buffer.from('Hello World').toString('base64'),
      ...fileData
    };
    
    return chai.request(app)
      .post('/files')
      .set('X-Token', token)
      .send(defaultData);
  }
};

export default testHelper;
