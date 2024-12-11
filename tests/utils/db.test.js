import { expect } from 'chai';
import dbClient from '../../utils/db';

describe('DBClient', () => {
  before(async () => {
    await dbClient.connect();
  });

  it('should be alive', () => {
    expect(dbClient.isAlive()).to.be.true;
  });

  it('should return correct number of users', async () => {
    const nbUsers = await dbClient.nbUsers();
    expect(nbUsers).to.be.a('number');
  });

  it('should return correct number of files', async () => {
    const nbFiles = await dbClient.nbFiles();
    expect(nbFiles).to.be.a('number');
  });
});
