import { describe, it, expect } from '@sc-voice/vitest';
import should from 'should';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const Task = require('../src/task.cjs');

describe('task', () => {
  it('Task(opts) is constructor', () => {
    let task = new Task();
    should(task).properties({
      actionsDone: 0,
      actionsTotal: 0,
      msActive: 0,
      isActive: false,
    });
    should(task).properties([
      'uuid',
      'name',
      'summary',
      'started',
      'lastActive',
      'msActive',
    ]);

    task = new Task({
      name: 'test-task',
      actionsTotal: 42,
      actionsDone: 10,
    });
    should(task.name).equal('test-task');
    should(task).properties({
      actionsTotal: 42,
      actionsDone: 10,
      isActive: true,
    });
  });

  it('actionsTotal records total task action count', async () => {
    const task = new Task();
    const { started } = task;
    should(task.lastActive).equal(task.started);
    await new Promise(resolve => setTimeout(resolve, 10));
    task.actionsTotal++;
    should(task.actionsTotal).equal(1);
    should(task.actionsDone).equal(0);
    should(task.lastActive).above(started);
  });

  it('actionsDone records number of completed actions', async () => {
    const task = new Task({
      actionsTotal: 1,
    });
    const { started, lastActive } = task;
    should(task.actionsTotal).equal(1);
    await new Promise(resolve => setTimeout(resolve, 10));
    task.actionsDone++;
    should(task.actionsTotal).equal(1);
    should(task.actionsDone).equal(1);
    should(task.lastActive).above(lastActive);
    should(task.started).equal(started);
  });

  it('start(summary) restarts task', async () => {
    const task = new Task();
    const { started } = task;
    await new Promise(resolve => setTimeout(resolve, 10));
    task.actionsTotal = 123;
    task.actionsDone = 45;
    should(task.actionsTotal).equal(123);
    should(task.actionsDone).equal(45);
    should(task.start('testing-start', 3, 2)).equal(task);
    should(task.started).above(started);
    should(task.actionsTotal).equal(3);
    should(task.actionsDone).equal(2);

    should(task.start('testing-start')).equal(task);
    should(task.actionsTotal).equal(0);
    should(task.actionsDone).equal(0);
  });

  it('isActive returns true if there are actions to be done', () => {
    const task = new Task();
    should(task.isActive).equal(false);
    task.actionsTotal++;
    should(task.isActive).equal(true);
    task.actionsDone++;
    should(task.isActive).equal(false);
    task.actionsTotal++;
    should(task.isActive).equal(true);
    task.error = new Error('test error');
    should(task.isActive).equal(false);
  });

  it('msActive returns milliseconds of activity', async () => {
    const task = new Task();
    should(task.msActive).equal(0);
    await new Promise(resolve => setTimeout(resolve, 10));
    task.actionsTotal++;
    should(task.msActive).above(8).below(50);
  });
});
