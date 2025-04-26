import { ClassMember } from './classTypes.js';
import { vi, describe, it, expect } from 'vitest';
const spyOn = vi.spyOn;

const staticCssStyle = 'text-decoration:underline;';
const abstractCssStyle = 'font-style:italic;';

describe('given text representing a method, ', function () {
  describe('when method has no parameters', function () {
    it('should parse correctly', function() {});

    it('should handle public visibility', function() {});

    it('should handle private visibility', function() {});

    it('should handle protected visibility', function() {});

    it('should handle internal visibility', function() {});

    it('should return correct css for static classifier', function() {});

    it('should return correct css for abstract classifier', function() {});
  });

  describe('when method has single parameter value', function () {
    it('should parse correctly', function() {});

    it('should handle public visibility', function() {});

    it('should handle private visibility', function() {});

    it('should handle protected visibility', function() {});

    it('should handle internal visibility', function() {});

    it('should return correct css for static classifier', function() {});

    it('should return correct css for abstract classifier', function() {});
  });

  describe('when method has single parameter type and name (type first)', function () {
    it('should parse correctly', function() {});

    it('should handle public visibility', function() {});

    it('should handle private visibility', function() {});

    it('should handle protected visibility', function() {});

    it('should handle internal visibility', function() {});

    it('should return correct css for static classifier', function() {});

    it('should return correct css for abstract classifier', function() {});
  });

  describe('when method has single parameter type and name (name first)', function () {
    it('should parse correctly', function() {});

    it('should handle public visibility', function() {});

    it('should handle private visibility', function() {});

    it('should handle protected visibility', function() {});

    it('should handle internal visibility', function() {});

    it('should return correct css for static classifier', function() {});

    it('should return correct css for abstract classifier', function() {});
  });

  describe('when method has multiple parameters', function () {
    it('should parse correctly', function() {});

    it('should handle public visibility', function() {});

    it('should handle private visibility', function() {});

    it('should handle protected visibility', function() {});

    it('should handle internal visibility', function() {});

    it('should return correct css for static classifier', function() {});

    it('should return correct css for abstract classifier', function() {});
  });

  describe('when method has return type', function () {
    it('should parse correctly', function() {});

    it('should handle public visibility', function() {});

    it('should handle private visibility', function() {});

    it('should handle protected visibility', function() {});

    it('should handle internal visibility', function() {});

    it('should return correct css for static classifier', function() {});

    it('should return correct css for abstract classifier', function() {});
  });

  describe('when method parameter is generic', function () {
    it('should parse correctly', function() {});

    it('should handle public visibility', function() {});

    it('should handle private visibility', function() {});

    it('should handle protected visibility', function() {});

    it('should handle internal visibility', function() {});

    it('should return correct css for static classifier', function() {});

    it('should return correct css for abstract classifier', function() {});
  });

  describe('when method parameter contains two generic', function () {
    it('should parse correctly', function() {});

    it('should handle public visibility', function() {});

    it('should handle private visibility', function() {});

    it('should handle protected visibility', function() {});

    it('should handle internal visibility', function() {});

    it('should return correct css for static classifier', function() {});

    it('should return correct css for abstract classifier', function() {});
  });

  describe('when method parameter is a nested generic', function () {
    it('should parse correctly', function() {});

    it('should handle public visibility', function() {});

    it('should handle private visibility', function() {});

    it('should handle protected visibility', function() {});

    it('should handle internal visibility', function() {});

    it('should return correct css for static classifier', function() {});

    it('should return correct css for abstract classifier', function() {});
  });

  describe('when method parameter is a composite generic', function () {
    const methodNameAndParameters = 'getTimes(List~K, V~)';
    const expectedMethodNameAndParameters = 'getTimes(List<K, V>)';
    it('should parse correctly', function() {});

    it('should handle public visibility', function() {});

    it('should handle private visibility', function() {});

    it('should handle protected visibility', function() {});

    it('should handle internal visibility', function() {});

    it('should return correct css for static classifier', function() {});

    it('should return correct css for abstract classifier', function() {});
  });

  describe('when method return type is generic', function () {
    it('should parse correctly', function() {});

    it('should handle public visibility', function() {});

    it('should handle private visibility', function() {});

    it('should handle protected visibility', function() {});

    it('should handle internal visibility', function() {});

    it('should return correct css for static classifier', function() {});

    it('should return correct css for abstract classifier', function() {});
  });

  describe('when method return type is a nested generic', function () {
    it('should parse correctly', function() {});

    it('should handle public visibility', function() {});

    it('should handle private visibility', function() {});

    it('should handle protected visibility', function() {});

    it('should handle internal visibility', function() {});

    it('should return correct css for static classifier', function() {});

    it('should return correct css for abstract classifier', function() {});
  });

  describe('--uncategorized tests--', function () {
    it('member name should handle double colons', function() {});

    it('member name should handle generic type', function() {});
  });
});

describe('given text representing an attribute', () => {
  describe('when the attribute has no modifiers', () => {
    it('should parse the display text correctly', () => {
      const str = 'name String';

      const displayDetails = new ClassMember(str, 'attribute').getDisplayDetails();

      expect(displayDetails.displayText).toBe('name String');
      expect(displayDetails.cssStyle).toBe('');
    });
  });

  describe('when the attribute has public "+" modifier', () => {
    it('should parse the display text correctly', () => {
      const str = '+name String';

      const displayDetails = new ClassMember(str, 'attribute').getDisplayDetails();

      expect(displayDetails.displayText).toBe('+name String');
      expect(displayDetails.cssStyle).toBe('');
    });
  });

  describe('when the attribute has protected "#" modifier', () => {
    it('should parse the display text correctly', () => {
      const str = '#name String';

      const displayDetails = new ClassMember(str, 'attribute').getDisplayDetails();

      expect(displayDetails.displayText).toBe('#name String');
      expect(displayDetails.cssStyle).toBe('');
    });
  });

  describe('when the attribute has private "-" modifier', () => {
    it('should parse the display text correctly', () => {
      const str = '-name String';

      const displayDetails = new ClassMember(str, 'attribute').getDisplayDetails();

      expect(displayDetails.displayText).toBe('-name String');
      expect(displayDetails.cssStyle).toBe('');
    });
  });

  describe('when the attribute has internal "~" modifier', () => {
    it('should parse the display text correctly', () => {
      const str = '~name String';

      const displayDetails = new ClassMember(str, 'attribute').getDisplayDetails();

      expect(displayDetails.displayText).toBe('~name String');
      expect(displayDetails.cssStyle).toBe('');
    });
  });

  describe('when the attribute has static "$" modifier', () => {
    it('should parse the display text correctly and apply static css style', () => {
      const str = 'name String$';

      const displayDetails = new ClassMember(str, 'attribute').getDisplayDetails();

      expect(displayDetails.displayText).toBe('name String');
      expect(displayDetails.cssStyle).toBe(staticCssStyle);
    });
  });

  describe('when the attribute has abstract "*" modifier', () => {
    it('should parse the display text correctly and apply abstract css style', () => {
      const str = 'name String*';

      const displayDetails = new ClassMember(str, 'attribute').getDisplayDetails();

      expect(displayDetails.displayText).toBe('name String');
      expect(displayDetails.cssStyle).toBe(abstractCssStyle);
    });
  });
});
