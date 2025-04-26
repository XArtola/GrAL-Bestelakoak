// @ts-expect-error Jison doesn't export types
import { parser } from './parser/classDiagram.jison';
import classDb from './classDb.js';
import { vi, describe, it, expect } from 'vitest';
import type { ClassMap, NamespaceNode } from './classTypes.js';
const spyOn = vi.spyOn;

const staticCssStyle = 'text-decoration:underline;';
const abstractCssStyle = 'font-style:italic;';

describe('given a basic class diagram, ', function () {
  describe('when parsing class definition', function () {
    beforeEach(function () {
      classDb.clear();
      parser.yy = classDb;
    });
    it('should handle accTitle and accDescr', function() {});

    it('should handle accTitle and multiline accDescr', function() {});

    it.skip('should handle a leading newline', function () {
      const str = '\nclassDiagram\n' + 'class Car';

      try {
        parser.parse(str);
        // Fail test if above expression doesn't throw anything.
      } catch (e) {
        expect(true).toBe(false);
      }
    });

    it('should handle backquoted class names', function() {});

    it('should handle class names with dash', function() {});

    it('should handle class names with underscore', function() {});

    it('should handle parsing of separators', function() {});

    it('should parse a class with a text label', () => {
      const str = 'classDiagram\n' + 'class C1["Class 1 with text label"]';

      parser.parse(str);

      const c1 = classDb.getClass('C1');
      expect(c1.label).toBe('Class 1 with text label');
    });

    it('should parse two classes with text labels', function() {});

    it('should parse a class with a text label and member', () => {
      const str = 'classDiagram\n' + 'class C1["Class 1 with text label"]\n' + 'C1: member1';

      parser.parse(str);
      const c1 = classDb.getClass('C1');
      expect(c1.label).toBe('Class 1 with text label');
      expect(c1.members.length).toBe(1);
      expect(c1.members[0].getDisplayDetails().displayText).toBe('member1');
    });

    it('should parse a class with a text label, member and annotation', () => {
      const str =
        'classDiagram\n' +
        'class C1["Class 1 with text label"]\n' +
        '<<interface>> C1\n' +
        'C1 : int member1';

      parser.parse(str);

      const c1 = classDb.getClass('C1');
      expect(c1.label).toBe('Class 1 with text label');
      expect(c1.members.length).toBe(1);
      expect(c1.members[0].getDisplayDetails().displayText).toBe('int member1');
      expect(c1.annotations.length).toBe(1);
      expect(c1.annotations[0]).toBe('interface');
    });

    it('should parse a class with text label and css class shorthand', () => {
      const str = 'classDiagram\n' + 'class C1["Class 1 with text label"]:::styleClass';

      parser.parse(str);

      const c1 = classDb.getClass('C1');
      expect(c1.label).toBe('Class 1 with text label');
      expect(c1.cssClasses[0]).toBe('styleClass');
    });

    it('should parse a class with text label and css class', () => {
      const str =
        'classDiagram\n' +
        'class C1["Class 1 with text label"]\n' +
        'C1 : int member1\n' +
        'cssClass "C1" styleClass';

      parser.parse(str);

      const c1 = classDb.getClass('C1');
      expect(c1.label).toBe('Class 1 with text label');
      expect(c1.members[0].getDisplayDetails().displayText).toBe('int member1');
      expect(c1.cssClasses[0]).toBe('styleClass');
    });

    it('should parse two classes with text labels and css classes', () => {
      const str =
        'classDiagram\n' +
        'class C1["Class 1 with text label"]\n' +
        'C1 : int member1\n' +
        'class C2["Long long long long long long long long long long label"]\n' +
        'cssClass "C1,C2" styleClass';

      parser.parse(str);

      const c1 = classDb.getClass('C1');
      expect(c1.label).toBe('Class 1 with text label');
      expect(c1.cssClasses[0]).toBe('styleClass');

      const c2 = classDb.getClass('C2');
      expect(c2.label).toBe('Long long long long long long long long long long label');
      expect(c2.cssClasses[0]).toBe('styleClass');
    });

    it('should parse two classes with text labels and css class shorthands', () => {
      const str =
        'classDiagram\n' +
        'class C1["Class 1 with text label"]:::styleClass1\n' +
        'class C2["Class 2 !@#$%^&*() label"]:::styleClass2';

      parser.parse(str);

      const c1 = classDb.getClass('C1');
      expect(c1.label).toBe('Class 1 with text label');
      expect(c1.cssClasses[0]).toBe('styleClass1');

      const c2 = classDb.getClass('C2');
      expect(c2.label).toBe('Class 2 !@#$%^&*() label');
      expect(c2.cssClasses[0]).toBe('styleClass2');
    });

    it('should parse multiple classes with same text labels', () => {
      parser.parse(`classDiagram
class C1["Class with text label"]
class C2["Class with text label"]
class C3["Class with text label"]`);

      const c1 = classDb.getClass('C1');
      expect(c1.label).toBe('Class with text label');

      const c2 = classDb.getClass('C2');
      expect(c2.label).toBe('Class with text label');

      const c3 = classDb.getClass('C3');
      expect(c3.label).toBe('Class with text label');
    });

    it('should parse classes with different text labels', () => {
      parser.parse(`classDiagram
class C1["OneWord"]
class C2["With, Comma"]
class C3["With (Brackets)"]
class C4["With [Brackets]"]
class C5["With {Brackets}"]
class C6[" "]
class C7["With 1 number"]
class C8["With . period..."]
class C9["With - dash"]
class C10["With _ underscore"]
class C11["With ' single quote"]
class C12["With ~!@#$%^&*()_+=-/?"]
class C13["With Città foreign language"]
`);
      expect(classDb.getClass('C1').label).toBe('OneWord');
      expect(classDb.getClass('C2').label).toBe('With, Comma');
      expect(classDb.getClass('C3').label).toBe('With (Brackets)');
      expect(classDb.getClass('C4').label).toBe('With [Brackets]');
      expect(classDb.getClass('C5').label).toBe('With {Brackets}');
      expect(classDb.getClass('C6').label).toBe(' ');
      expect(classDb.getClass('C7').label).toBe('With 1 number');
      expect(classDb.getClass('C8').label).toBe('With . period...');
      expect(classDb.getClass('C9').label).toBe('With - dash');
      expect(classDb.getClass('C10').label).toBe('With _ underscore');
      expect(classDb.getClass('C11').label).toBe("With ' single quote");
      expect(classDb.getClass('C12').label).toBe('With ~!@#$%^&*()_+=-/?');
      expect(classDb.getClass('C13').label).toBe('With Città foreign language');
    });

    it('should handle "note for"', function() {});

    it('should handle "note"', function() {});

    const keywords = [
      'direction',
      'classDiagram',
      'classDiagram-v2',
      'namespace',
      '{}',
      '{',
      '}',
      '()',
      '(',
      ')',
      '[]',
      '[',
      ']',
      'class',
      '\n',
      'cssClass',
      'callback',
      'link',
      'click',
      'note',
      'note for',
      '<<',
      '>>',
      'call ',
      '~',
      '~Generic~',
      '_self',
      '_blank',
      '_parent',
      '_top',
      '<|',
      '|>',
      '>',
      '<',
      '*',
      'o',
      '\\',
      '--',
      '..',
      '-->',
      '--|>',
      ': label',
      ':::',
      '.',
      '+',
      'alphaNum',
      '!',
      '0123',
      'function()',
      'function(arg1, arg2)',
    ];

    it.each(keywords)('should handle a note with %s in it', function (keyword: string) {
      const str = `classDiagram
                     note "This is a keyword: ${keyword}. It truly is."
                  `;
      parser.parse(str);
      expect(classDb.getNotes()[0].text).toEqual(`This is a keyword: ${keyword}. It truly is.`);
    });

    it.each(keywords)(
      'should handle note with %s at beginning of string',
      function (keyword: string) {
        const str = `classDiagram
                      note "${keyword}"`;

        parser.parse(str);
        expect(classDb.getNotes()[0].text).toEqual(`${keyword}`);
      }
    );

    it.each(keywords)('should handle a "note for" with a %s in it', function (keyword: string) {
      const str = `classDiagram
                   class Something {
                     int id
                     string name
                   }
                   note for Something "This is a keyword: ${keyword}. It truly is."
                   `;

      parser.parse(str);
      expect(classDb.getNotes()[0].text).toEqual(`This is a keyword: ${keyword}. It truly is.`);
    });

    it.each(keywords)(
      'should handle a "note for" with a %s at beginning of string',
      function (keyword: string) {
        const str = `classDiagram
                    class Something {
                      int id
                      string name
                    }
                    note for Something "${keyword}"
                    `;

        parser.parse(str);
        expect(classDb.getNotes()[0].text).toEqual(`${keyword}`);
      }
    );

    it.each(keywords)('should elicit error for %s after NOTE token', function (keyword: string) {
      const str = `classDiagram
                   note ${keyword}`;
      expect(() => parser.parse(str)).toThrowError(/(Expecting\s'STR'|Unrecognized\stext)/);
    });

    it('should parse diagram with direction', () => {
      parser.parse(`classDiagram
          direction TB
          class Student {
            -idCard : IdCard
          }
          class IdCard{
            -id : int
            -name : string
          }
          class Bike{
            -id : int
            -name : string
          }
          Student "1" --o "1" IdCard : carries
          Student "1" --o "1" Bike : rides`);

      expect(classDb.getClasses().size).toBe(3);
      expect(classDb.getClasses().get('Student')).toMatchInlineSnapshot(`
        {
          "annotations": [],
          "cssClasses": [],
          "domId": "classId-Student-134",
          "id": "Student",
          "label": "Student",
          "members": [
            ClassMember {
              "classifier": "",
              "id": "idCard : IdCard",
              "memberType": "attribute",
              "visibility": "-",
            },
          ],
          "methods": [],
          "styles": [],
          "type": "",
        }
      `);
      expect(classDb.getRelations().length).toBe(2);
      expect(classDb.getRelations()).toMatchInlineSnapshot(`
        [
          {
            "id1": "Student",
            "id2": "IdCard",
            "relation": {
              "lineType": 0,
              "type1": "none",
              "type2": 0,
            },
            "relationTitle1": "1",
            "relationTitle2": "1",
            "title": "carries",
          },
          {
            "id1": "Student",
            "id2": "Bike",
            "relation": {
              "lineType": 0,
              "type1": "none",
              "type2": 0,
            },
            "relationTitle1": "1",
            "relationTitle2": "1",
            "title": "rides",
          },
        ]
      `);
    });

    it('should revert direction to default once direction is removed', () => {
      parser.parse(`classDiagram
          direction RL
          class A`);
      expect(classDb.getDirection()).toBe('RL');
      classDb.clear();
      parser.parse(`classDiagram
          class B`);
      expect(classDb.getDirection()).toBe('TB');
    });
  });

  describe('when parsing class defined in brackets', function () {
    beforeEach(function () {
      classDb.clear();
      parser.yy = classDb;
    });

    it('should handle member definitions', function() {});

    it('should handle method definitions', function() {});

    it('should handle a mix of members defined in and outside of brackets', function() {});

    it('should handle member and method definitions', () => {
      const str =
        'classDiagram\n' + 'class Dummy_Class {\n' + 'String data\n' + 'void methods()\n' + '}';

      parser.parse(str);
    });

    it('should handle return types on methods', () => {
      const str =
        'classDiagram\n' +
        'class Flight {\n' +
        'int flightNumber\n' +
        'datetime departureTime\n' +
        'getDepartureTime() datetime\n' +
        '}';

      parser.parse(str);
    });

    it('should add bracket members in right order', () => {
      const str =
        'classDiagram\n' +
        'class Class1 {\n' +
        'int testMember\n' +
        'test()\n' +
        'string fooMember\n' +
        'foo()\n' +
        '}';
      parser.parse(str);

      const actual = parser.yy.getClass('Class1');
      expect(actual.members.length).toBe(2);
      expect(actual.methods.length).toBe(2);
      expect(actual.members[0].getDisplayDetails().displayText).toBe('int testMember');
      expect(actual.members[1].getDisplayDetails().displayText).toBe('string fooMember');
      expect(actual.methods[0].getDisplayDetails().displayText).toBe('test()');
      expect(actual.methods[1].getDisplayDetails().displayText).toBe('foo()');
    });

    it('should parse a class with a text label and members', () => {
      const str = 'classDiagram\n' + 'class C1["Class 1 with text label"] {\n' + '+member1\n' + '}';

      parser.parse(str);
      const c1 = classDb.getClass('C1');
      expect(c1.label).toBe('Class 1 with text label');
      expect(c1.members.length).toBe(1);
      expect(c1.members[0].getDisplayDetails().displayText).toBe('+member1');
    });

    it('should parse a class with a text label, members and annotation', () => {
      const str =
        'classDiagram\n' +
        'class C1["Class 1 with text label"] {\n' +
        '<<interface>>\n' +
        '+member1\n' +
        '}';

      parser.parse(str);
      const c1 = classDb.getClass('C1');
      expect(c1.label).toBe('Class 1 with text label');
      expect(c1.members.length).toBe(1);
      expect(c1.members[0].getDisplayDetails().displayText).toBe('+member1');
      expect(c1.annotations.length).toBe(1);
      expect(c1.annotations[0]).toBe('interface');
    });
  });

  describe('when parsing comments', function () {
    beforeEach(function () {
      classDb.clear();
      parser.yy = classDb;
    });

    it('should handle comments at the start', function() {});

    it('should handle comments at the end', function() {});

    it('should handle comments at the end no trailing newline', function() {});

    it('should handle a comment with multiple line feeds', function() {});

    it('should handle a comment with mermaid class diagram code in them', function() {});

    it('should handle a comment inside brackets', function() {});
  });

  describe('when parsing click statements', function () {
    beforeEach(function () {
      classDb.clear();
      parser.yy = classDb;
    });
    it('should handle href link', function() {});

    it('should handle href link with tooltip', function() {});

    it('should handle href link with tooltip and target', function() {});

    it('should handle function call', function() {});

    it('should handle function call with tooltip', function() {});

    it('should handle function call with an arbitrary number of args', function() {});

    it('should handle function call with an arbitrary number of args and tooltip', function() {});
  });

  describe('when parsing annotations', function () {
    beforeEach(function () {
      classDb.clear();
      parser.yy = classDb;
    });

    it('should handle class annotations', function() {});

    it('should handle class annotations with members and methods', function() {});

    it('should handle class annotations in brackets', function() {});

    it('should handle class annotations in brackets with members and methods', function() {});
  });
});

describe('given a class diagram with members and methods ', function () {
  describe('when parsing members', function () {
    beforeEach(function () {
      classDb.clear();
      parser.yy = classDb;
    });

    it('should handle simple member declaration', function() {});

    it('should handle direct member declaration', function() {});

    it('should handle direct member declaration with type', function() {});

    it('should handle simple member declaration with type', function() {});

    it('should handle visibility', function() {});

    it('should handle generic types', function() {});
  });

  describe('when parsing method definition', function () {
    beforeEach(function () {
      classDb.clear();
      parser.yy = classDb;
    });

    it('should handle method definition', function() {});

    it('should handle simple return types', function() {});

    it('should handle return types as array', function() {});

    it('should handle visibility', function() {});

    it('should handle abstract methods', function() {});

    it('should handle static methods', function() {});

    it('should handle generic types in arguments', function() {});

    it('should handle generic return types', function() {});

    it('should handle generic types in members in class with brackets', function() {});
  });
});

describe('given a class diagram with generics, ', function () {
  describe('when parsing valid generic classes', function () {
    beforeEach(function () {
      classDb.clear();
      parser.yy = classDb;
    });

    it('should handle generic class', function() {});

    it('should handle generic class with relationships', function() {});

    it('should handle generic class with a literal name', function() {});

    it('should handle generic class with brackets', function() {});

    it('should handle generic class with brackets and a literal name', function() {});

    it('should handle "namespace"', function() {});

    it('should handle namespace with generic types', () => {
      parser.parse(`classDiagram

namespace space {
    class Square~Shape~{
        int id
        List~int~ position
        setPoints(List~int~ points)
        getPoints() List~int~
    }
}`);
    });
  });
});

describe('given a class diagram with relationships, ', function () {
  describe('when parsing basic relationships', function () {
    beforeEach(function () {
      classDb.clear();
      parser.yy = classDb;
    });

    it('should handle all basic relationships', function() {});

    it('should handle backquoted class name', function() {});

    it('should handle generics', function() {});

    it('should handle relationships with labels', function() {});

    it('should handle relation definitions EXTENSION', function() {});

    it('should handle relation definition of different types and directions', function() {});

    it('should handle cardinality and labels', function() {});

    it('should handle dashed relation definition of different types and directions', function() {});

    it('should handle relation definitions AGGREGATION and dotted line', function() {});

    it('should handle relation definitions COMPOSITION on both sides', function() {});

    it('should handle relation definitions with no types', function() {});

    it('should handle relation definitions with type only on right side', function() {});

    it('should handle multiple classes and relation definitions', function() {});

    it('should handle generic class with relation definitions', function() {});

    it('should handle class annotations', function() {});

    it('should handle class annotations with members and methods', function() {});

    it('should handle class annotations in brackets', function() {});

    it('should handle class annotations in brackets with members and methods', function() {});

    it('should add bracket members in right order', function() {});

    it('should handle abstract methods', function() {});

    it('should handle static methods', function() {});

    it('should associate link and css appropriately', function() {});

    it('should associate click and href link and css appropriately', function() {});

    it('should associate link with tooltip', function() {});

    it('should associate click and href link with tooltip', function() {});

    it('should associate click and href link with tooltip and target appropriately', function() {});

    it('should associate click and href link appropriately', function() {});

    it('should associate click and href link with target appropriately', function() {});

    it('should associate link appropriately', function() {});

    it('should associate callback appropriately', function() {});

    it('should associate click and call callback appropriately', function() {});

    it('should associate callback appropriately with an arbitrary number of args', function() {});

    it('should associate callback with tooltip', function() {});

    it('should add classes namespaces', function() {});

    it('should add relations between classes of different namespaces', function() {});
  });

  describe('when parsing classDiagram with text labels', () => {
    beforeEach(function () {
      parser.yy = classDb;
      parser.yy.clear();
    });

    it('should parse a class with a text label', () => {
      parser.parse(`classDiagram
  class C1["Class 1 with text label"]
  C1 -->  C2
      `);
      const c1 = classDb.getClass('C1');
      expect(c1.label).toBe('Class 1 with text label');
      const c2 = classDb.getClass('C2');
      expect(c2.label).toBe('C2');
    });

    it('should parse two classes with text labels', () => {
      parser.parse(`classDiagram
  class C1["Class 1 with text label"]
  class C2["Class 2 with chars @?"]
  C1 -->  C2
      `);
      const c1 = classDb.getClass('C1');
      expect(c1.label).toBe('Class 1 with text label');
      const c2 = classDb.getClass('C2');
      expect(c2.label).toBe('Class 2 with chars @?');
    });

    it('should parse a class with a text label and members', () => {
      parser.parse(`classDiagram
  class C1["Class 1 with text label"] {
    +member1
  }
  C1 -->  C2
      `);
      const c1 = classDb.getClass('C1');
      expect(c1.label).toBe('Class 1 with text label');
      expect(c1.members.length).toBe(1);
      const member = c1.members[0];
      expect(member.getDisplayDetails().displayText).toBe('+member1');
      const c2 = classDb.getClass('C2');
      expect(c2.label).toBe('C2');
    });

    it('should parse a class with a text label, members and annotation', () => {
      parser.parse(`classDiagram
  class C1["Class 1 with text label"] {
    <<interface>>
    +member1
  }
  C1 -->  C2
      `);
      const c1 = classDb.getClass('C1');
      expect(c1.label).toBe('Class 1 with text label');
      expect(c1.members.length).toBe(1);
      expect(c1.annotations.length).toBe(1);
      expect(c1.annotations[0]).toBe('interface');
      const member = c1.members[0];
      expect(member.getDisplayDetails().displayText).toBe('+member1');

      const c2 = classDb.getClass('C2');
      expect(c2.label).toBe('C2');
    });

    it('should parse a class with text label and css class shorthand', () => {
      parser.parse(`classDiagram
class C1["Class 1 with text label"]:::styleClass {
  +member1
}
C1 -->  C2
  `);

      const c1 = classDb.getClass('C1');
      expect(c1.label).toBe('Class 1 with text label');
      expect(c1.cssClasses.length).toBe(1);
      expect(c1.cssClasses[0]).toBe('styleClass');
      const member = c1.members[0];
      expect(member.getDisplayDetails().displayText).toBe('+member1');
    });

    it('should parse a class with text label and css class', () => {
      parser.parse(`classDiagram
class C1["Class 1 with text label"] {
  +member1
}
C1 --> C2
cssClass "C1" styleClass
  `);

      const c1 = classDb.getClass('C1');
      expect(c1.label).toBe('Class 1 with text label');
      expect(c1.cssClasses.length).toBe(1);
      expect(c1.cssClasses[0]).toBe('styleClass');
      const member = c1.members[0];
      expect(member.getDisplayDetails().displayText).toBe('+member1');
    });

    it('should parse two classes with text labels and css classes', () => {
      parser.parse(`classDiagram
class C1["Class 1 with text label"] {
  +member1
}
class C2["Long long long long long long long long long long label"]
C1 --> C2
cssClass "C1,C2" styleClass
  `);

      const c1 = classDb.getClass('C1');
      expect(c1.label).toBe('Class 1 with text label');
      expect(c1.cssClasses.length).toBe(1);
      expect(c1.cssClasses[0]).toBe('styleClass');

      const c2 = classDb.getClass('C2');
      expect(c2.label).toBe('Long long long long long long long long long long label');
      expect(c2.cssClasses.length).toBe(1);
      expect(c2.cssClasses[0]).toBe('styleClass');
    });

    it('should parse two classes with text labels and css class shorthands', () => {
      parser.parse(`classDiagram
class C1["Class 1 with text label"]:::styleClass1 {
  +member1
}
class C2["Class 2 !@#$%^&*() label"]:::styleClass2
C1 --> C2
  `);

      const c1 = classDb.getClass('C1');
      expect(c1.label).toBe('Class 1 with text label');
      expect(c1.cssClasses.length).toBe(1);
      expect(c1.cssClasses[0]).toBe('styleClass1');

      const c2 = classDb.getClass('C2');
      expect(c2.label).toBe('Class 2 !@#$%^&*() label');
      expect(c2.cssClasses.length).toBe(1);
      expect(c2.cssClasses[0]).toBe('styleClass2');
    });

    it('should parse multiple classes with same text labels', () => {
      parser.parse(`classDiagram
class C1["Class with text label"]
class C2["Class with text label"]
class C3["Class with text label"]
C1 --> C2
C3 ..> C2
  `);

      const c1 = classDb.getClass('C1');
      expect(c1.label).toBe('Class with text label');

      const c2 = classDb.getClass('C2');
      expect(c2.label).toBe('Class with text label');

      const c3 = classDb.getClass('C3');
      expect(c3.label).toBe('Class with text label');
    });

    it('should parse classes with different text labels', () => {
      parser.parse(`classDiagram
class C1["OneWord"]
class C2["With, Comma"]
class C3["With (Brackets)"]
class C4["With [Brackets]"]
class C5["With {Brackets}"]
class C6[" "]
class C7["With 1 number"]
class C8["With . period..."]
class C9["With - dash"]
class C10["With _ underscore"]
class C11["With ' single quote"]
class C12["With ~!@#$%^&*()_+=-/?"]
class C13["With Città foreign language"]
`);
      expect(classDb.getClass('C1').label).toBe('OneWord');
      expect(classDb.getClass('C2').label).toBe('With, Comma');
      expect(classDb.getClass('C3').label).toBe('With (Brackets)');
      expect(classDb.getClass('C4').label).toBe('With [Brackets]');
      expect(classDb.getClass('C5').label).toBe('With {Brackets}');
      expect(classDb.getClass('C6').label).toBe(' ');
      expect(classDb.getClass('C7').label).toBe('With 1 number');
      expect(classDb.getClass('C8').label).toBe('With . period...');
      expect(classDb.getClass('C9').label).toBe('With - dash');
      expect(classDb.getClass('C10').label).toBe('With _ underscore');
      expect(classDb.getClass('C11').label).toBe("With ' single quote");
      expect(classDb.getClass('C12').label).toBe('With ~!@#$%^&*()_+=-/?');
      expect(classDb.getClass('C13').label).toBe('With Città foreign language');
    });
  });
});
