// @ts-nocheck TODO: Fix TS
import dayjs from 'dayjs';
import ganttDb from './ganttDb.js';
import { convert } from '../../tests/util.js';

describe('when using the ganttDb', function () {
  beforeEach(function () {
    ganttDb.clear();
  });

  describe('when using duration', function () {
    it.each([{ str: '1d', expected: [1, 'd'] }])(
      'should %s resulting in $o duration',
      ({ str, expected }) => {
        expect(ganttDb.parseDuration(str)).toEqual(expected);
      }
    );

    it.each(
      convert`
      str       | expected
      ${'1d'}   | ${[1, 'd']}
      ${'2w'}   | ${[2, 'w']}
      ${'1ms'}  | ${[1, 'ms']}
      ${'0.1s'} | ${[0.1, 's']}
      ${'1f'}   | ${[NaN, 'ms']}
    `
    )('should $str resulting in $expected duration', ({ str, expected }) => {
      expect(ganttDb.parseDuration(str)).toEqual(expected);
    });
  });

  describe('when calling the clear function', function () {
    beforeEach(function () {
      ganttDb.setDateFormat('YYYY-MM-DD');
      ganttDb.enableInclusiveEndDates();
      ganttDb.setDisplayMode('compact');
      ganttDb.setTodayMarker('off');
      ganttDb.setExcludes('weekends 2019-02-06,friday');
      ganttDb.addSection('weekends skip test');
      ganttDb.addTask('test1', 'id1,2019-02-01,1d');
      ganttDb.addTask('test2', 'id2,after id1,2d');
      ganttDb.clear();
    });

    it.each(convert`
      fn                        | expected
      ${'getTasks'}             | ${[]}
      ${'getAccTitle'}          | ${''}
      ${'getAccDescription'}    | ${''}
      ${'getDateFormat'}        | ${''}
      ${'getAxisFormat'}        | ${''}
      ${'getTodayMarker'}       | ${''}
      ${'getExcludes'}          | ${[]}
      ${'getSections'}          | ${[]}
      ${'endDatesAreInclusive'} | ${false}
      ${'getDisplayMode'}       | ${''}
    `)('should clear $fn', ({ fn, expected }) => {
      expect(ganttDb[fn]()).toEqual(expected);
    });
  });

  // prettier-ignore
  it.each(convert`
    testName                                                                             | section     | taskName   | taskData                       | expStartDate            | expEndDate                       | expId      | expTask
    ${'should handle fixed dates'}                                                       | ${'testa1'} | ${'test1'} | ${'id1,2013-01-01,2013-01-12'} | ${new Date(2013, 0, 1)} | ${new Date(2013, 0, 12)}         | ${'id1'}   | ${'test1'}
    ${'should handle duration (days) instead of fixed date to determine end date'}       | ${'testa1'} | ${'test1'} | ${'id1,2013-01-01,2d'}         | ${new Date(2013, 0, 1)} | ${new Date(2013, 0, 3)}          | ${'id1'}   | ${'test1'}
    ${'should handle duration (hours) instead of fixed date to determine end date'}      | ${'testa1'} | ${'test1'} | ${'id1,2013-01-01,2h'}         | ${new Date(2013, 0, 1)} | ${new Date(2013, 0, 1, 2)}       | ${'id1'}   | ${'test1'}
    ${'should handle duration (minutes) instead of fixed date to determine end date'}    | ${'testa1'} | ${'test1'} | ${'id1,2013-01-01,2m'}         | ${new Date(2013, 0, 1)} | ${new Date(2013, 0, 1, 0, 2)}    | ${'id1'}   | ${'test1'}
    ${'should handle duration (seconds) instead of fixed date to determine end date'}    | ${'testa1'} | ${'test1'} | ${'id1,2013-01-01,2s'}         | ${new Date(2013, 0, 1)} | ${new Date(2013, 0, 1, 0, 0, 2)} | ${'id1'}   | ${'test1'}
    ${'should handle duration (weeks) instead of fixed date to determine end date'}      | ${'testa1'} | ${'test1'} | ${'id1,2013-01-01,2w'}         | ${new Date(2013, 0, 1)} | ${new Date(2013, 0, 15)}         | ${'id1'}   | ${'test1'}
    ${'should handle fixed dates without id'}                                            | ${'testa1'} | ${'test1'} | ${'2013-01-01,2013-01-12'}     | ${new Date(2013, 0, 1)} | ${new Date(2013, 0, 12)}         | ${'task1'} | ${'test1'}
    ${'should handle duration instead of a fixed date to determine end date without id'} | ${'testa1'} | ${'test1'} | ${'2013-01-01,4d'}             | ${new Date(2013, 0, 1)} | ${new Date(2013, 0, 5)}          | ${'task1'} | ${'test1'}
  `)('$testName', ({ section, taskName, taskData, expStartDate, expEndDate, expId, expTask }) => {
    ganttDb.setDateFormat('YYYY-MM-DD');
    ganttDb.addSection(section);
    ganttDb.addTask(taskName, taskData);
    const tasks = ganttDb.getTasks();
    expect(tasks[0].startTime).toEqual(expStartDate);
    expect(tasks[0].endTime).toEqual(expEndDate);
    expect(tasks[0].id).toEqual(expId);
    expect(tasks[0].task).toEqual(expTask);
  });

  // prettier-ignore
  it.each(convert`
    section     | taskName1  | taskName2  | taskData1              | taskData2             | expStartDate2                                | expEndDate2              | expId2     | expTask2
    ${'testa1'} | ${'test1'} | ${'test2'} | ${'id1,2013-01-01,2w'} | ${'id2,after id1,1d'} | ${new Date(2013, 0, 15)}                     | ${undefined}             | ${'id2'}   | ${'test2'}
    ${'testa1'} | ${'test1'} | ${'test2'} | ${'id1,2013-01-01,2w'} | ${'id2,after id3,1d'} | ${new Date(new Date().setHours(0, 0, 0, 0))} | ${undefined}             | ${'id2'}   | ${'test2'}
    ${'testa1'} | ${'test1'} | ${'test2'} | ${'id1,2013-01-01,2w'} | ${'after id1,1d'}     | ${new Date(2013, 0, 15)}                     | ${undefined}             | ${'task1'} | ${'test2'}
    ${'testa1'} | ${'test1'} | ${'test2'} | ${'id1,2013-01-01,2w'} | ${'2013-01-26'}       | ${new Date(2013, 0, 15)}                     | ${new Date(2013, 0, 26)} | ${'task1'} | ${'test2'}
    ${'testa1'} | ${'test1'} | ${'test2'} | ${'id1,2013-01-01,2w'} | ${'2d'}               | ${new Date(2013, 0, 15)}                     | ${new Date(2013, 0, 17)} | ${'task1'} | ${'test2'}
  `)(
    '$testName',
    ({
      section,
      taskName1,
      taskName2,
      taskData1,
      taskData2,
      expStartDate2,
      expEndDate2,
      expId2,
      expTask2,
    }) => {
      ganttDb.setDateFormat('YYYY-MM-DD');
      ganttDb.addSection(section);
      ganttDb.addTask(taskName1, taskData1);
      ganttDb.addTask(taskName2, taskData2);
      const tasks = ganttDb.getTasks();
      expect(tasks[1].startTime).toEqual(expStartDate2);
      if (expEndDate2) {
        expect(tasks[1].endTime).toEqual(expEndDate2);
      }
      expect(tasks[1].id).toEqual(expId2);
      expect(tasks[1].task).toEqual(expTask2);
    }
  );

  it('should handle milliseconds', function() {});

  it('should handle relative start date based on id regardless of sections', function() {});

  it('should handle relative end date based on id regardless of sections', function() {});

  it('should handle relative start date based on multiple id', function() {});

  it('should handle relative end date based on multiple id', function() {});

  it('should ignore weekends', function() {});

  it('should ignore weekends starting on friday', function() {});

  it('should maintain the order in which tasks are created', function() {});

  it('should work when end date is the 31st', function() {});

  /**
   * Unfortunately, Vitest has no way of modifying the timezone at runtime, so
   * in order to test this, please run this test with
   *
   * ```bash
   * TZ='America/Los_Angeles' pnpm exec vitest run ganttDb
   * ```
   */
  /* c8 ignore start */ // tell code-coverage to ignore this block of code
  describe.skipIf(process.env.TZ != 'America/Los_Angeles')(
    'when using a timezone with daylight savings (only run if TZ="America/Los_Angeles")',
    () => {
      it('should add 1 day even on days with 25 hours', function() {});
    }
  );
  /* c8 ignore stop */

  describe('when setting inclusive end dates', function () {
    beforeEach(function () {
      ganttDb.setDateFormat('YYYY-MM-DD');
      ganttDb.enableInclusiveEndDates();
      ganttDb.addTask('test1', 'id1,2019-02-01,1d');
      ganttDb.addTask('test2', 'id2,2019-02-01,2019-02-03');
    });
    it('should automatically add one day to all end dates', function() {});
  });

  it.each(convert`
    type       | expected
    ${'hide'}  | ${'off'}
    ${'style'} | ${'stoke:stroke-width:5px,stroke:#00f,opacity:0.5'}
  `)('should ${type} today marker', ({ expected }) => {
    ganttDb.setTodayMarker(expected);
    expect(ganttDb.getTodayMarker()).toEqual(expected);
  });

  it('should reject dates with ridiculous years', function() {});
});
