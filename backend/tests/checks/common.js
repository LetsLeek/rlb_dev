const request = require('supertest');
const assert = require('assert');
const server = require('../../server'); 

// Beispielhafte Daten
const validCheck = {
  date: "29.08.2024",
  state: "In Progress",
  isChecked: false,
  remark: "",
  department: "IT",
};

describe('Checks API', function() {
  let checkId;

  // Test für das Erstellen eines neuen Checks
  it('should create a new check', async function() {
    const response = await request(server)
      .post('/api/checks')
      .send(validCheck)
      .expect(201)
      .expect('Content-Type', /json/);

    checkId = response.body.id; // Speichere die ID für spätere Tests

    assert.equal(typeof response.body, 'object');
    assert.notEqual(checkId, undefined);
    assert.equal(response.body.date, validCheck.date);
  });

  // Test für das Abrufen aller Checks
  it('should get all checks', async function() {
    const response = await request(server)
      .get('/api/checks')
      .expect(200)
      .expect('Content-Type', /json/);

    assert.equal(Array.isArray(response.body), true);
    assert(response.body.some(check => check.id === checkId)); // Überprüfe, ob der erstellte Check dabei ist
  });

  // Test für das Abrufen eines Checks nach ID
  it('should get a check by ID', async function() {
    const response = await request(server)
      .get(`/api/checks/${checkId}`)
      .expect(200)
      .expect('Content-Type', /json/);

    assert.equal(response.body.id, checkId);
    assert.equal(response.body.date, validCheck.date);
  });

  // Test für das Aktualisieren eines Checks
  it('should update a check', async function() {
    const updatedCheck = { ...validCheck, remark: "Updated check" };

    const response = await request(server)
      .put('/api/checks/')
      .send({ id: checkId, ...updatedCheck })
      .expect(200)
      .expect('Content-Type', /json/);

    assert.equal(response.body.remark, "Updated check");
    assert.equal(response.body.id, checkId);
  });

  // Test für das Löschen eines Checks
  it('should delete a check', async function() {
    await request(server)
      .delete(`/api/checks/${checkId}`)
      .expect(204);

    // Überprüfen, ob der Check gelöscht wurde
    await request(server)
      .get(`/api/checks/${checkId}`)
      .expect(404);
  });
});
