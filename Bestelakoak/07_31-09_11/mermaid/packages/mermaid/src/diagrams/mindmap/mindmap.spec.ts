// @ts-expect-error No types available for JISON
import { parser as mindmap } from './parser/mindmap.jison';
import mindmapDB from './mindmapDb.js';
// Todo fix utils functions for tests
import { setLogLevel } from '../../diagram-api/diagramAPI.js';

describe('when parsing a mindmap ', function () {
  beforeEach(function () {
    mindmap.yy = mindmapDB;
    mindmap.yy.clear();
    setLogLevel('trace');
  });
  describe('hiearchy', function () {
    it('MMP-1 should handle a simple root definition abc122', function() {});
    it('MMP-2 should handle a hierachial mindmap definition', function() {});

    it('3 should handle a simple root definition with a shape and without an id abc123', function() {});

    it('MMP-4 should handle a deeper hierachial mindmap definition', function() {});
    it('5 Multiple roots are illegal', function() {});
    it('MMP-6 real root in wrong place', function() {});
  });
  describe('nodes', function () {
    it('MMP-7 should handle an id and type for a node definition', function() {});
    it('MMP-8 should handle an id and type for a node definition', function() {});
    it('MMP-9 should handle an id and type for a node definition', function() {});
    it('MMP-10 multiple types (circle)', function() {});

    it('MMP-11 multiple types (cloud)', function() {});
    it('MMP-12 multiple types (bang)', function() {});

    it('MMP-12-a multiple types (hexagon)', function() {});
  });
  describe('decorations', function () {
    it('MMP-13 should be possible to set an icon for the node', function() {});
    it('MMP-14 should be possible to set classes for the node', function() {});
    it('MMP-15 should be possible to set both classes and icon for the node', function() {});
    it('MMP-16 should be possible to set both classes and icon for the node', function() {});
  });
  describe('descriptions', function () {
    it('MMP-17 should be possible to use node syntax in the descriptions', function() {});
    it('MMP-18 should be possible to use node syntax in the descriptions in children', function() {});
    it('MMP-19 should be possible to have a child after a class assignment', function() {});
  });
  it('MMP-20 should be possible to have meaningless empty rows in a mindmap abc124', function() {});
  it('MMP-21 should be possible to have comments in a mindmap', function() {});

  it('MMP-22 should be possible to have comments at the end of a line', function() {});
  it('MMP-23 Rows with only spaces should not interfere', function() {});
  it('MMP-24 Handle rows above the mindmap declarations', function() {});
  it('MMP-25 Handle rows above the mindmap declarations, no space', function() {});
});
