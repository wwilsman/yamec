import _ from './helpers';

const TAGREG = /^<([\w-]+)|\s+([\w-]+)(?:=?("|')(.*?)(\3))?/g;
const EMPTYELEMENTREG = /hr|br|img/;
const PHRASINGMODELREG = /p|pre/;
  
class EditorSerializer {
  constructor(opts = {}) {
    var defaults = this.constructor.defaults;
    
    this.allowed = this.allowed || {};
    
    this.allowed.outer = 
      opts.outerElements ||   // new option
      defaults.outerElements; // default
    
    this.allowed.inner = 
      opts.innerElements ||
      defaults.innerElements;
    
    this.conversions = 
      opts.conversions ||
      defaults.conversions;
    
    this.stripAttributes = 
      opts.stripAttributes ||
      defaults.stripAttributes;
  }
  
  sanitizeElement(object, context, i) {
    var convertedTag,
      allowed = 
        context === this.elements ?
        this.allowed.outer :
        this.allowed.inner;

    // remove empty elements (non self-closing)
    if (object.content !== undefined && !object.content) {
      delete context[i];
    }
    
    // convert tag
    if ((convertedTag = this.conversions[object.tagName])) {
      object.tagName = convertedTag;
    }
    
    // filter tag
    if (allowed.indexOf(object.tagName) === -1) {
      delete context[i];
    }
    
    // strip attributes
    for (let attr in object.attributes) {
      if (this.stripAttributes.indexOf(attr) !== -1) {
        delete object.attributes[attr];
      }
    }
  }
    
  serialize(dom) {
    var sanitizeChildren = (object, i, context) => {
      this.sanitizeElement(object, context, i);
    };
    
    // collect elements
    this.elements = _.slice.call(dom.children).map(el => {
      return this.serializeBlock(el);
    });
    
    // sanitize elements
    for (let blockObject of this.elements) {
      this.sanitizeElement(blockObject, this.elements);
      
      // only sanitize inner if outer model is phrasing content
      if (PHRASINGMODELREG.test(blockObject.tagName)) {
        blockObject.children.forEach(sanitizeChildren);
      }
    }

    return this;
  }
  
  serializeBlock(element) {
    var blockObject,
    
      pointer = 0,             // current index in text
      
      html = _.toHTML(element),  // element as HTML
      dirty = html.split(''),  // array of characters to step through
      sanitized = [],          // html -> text
     
      char,                    // current character
      lastChar,                // character before current
      nextChar,                // character after current
      
      objects = [],            // collected elements
      
      workingObjects = [],     // elements that we are within
      workingObjectIndex = -1, // current element's depth
  
      // open a new element
      newObject = function() {
        var obj = {
          tag: '',
          content: ''
        };
        
        workingObjects.push(obj);
        workingObjectIndex += 1;
        
        return obj;
      },
        
      // Moves the element from working to collection
      addObject = function(obj) {
        objects.push(obj);
        workingObjects.splice(workingObjectIndex, 1);
        workingObjectIndex -= 1;
      },

      openingTag = false,      // pointer is inside opening tag
      closingTag = false;      // pointer is inside closing tag
    
    // step through html to collect  electements
    while ((char = dirty[0])) {
      nextChar = dirty[1];

      // get current working object
      let object = 
        workingObjectIndex !== -1 ?          // if
        workingObjects[workingObjectIndex] : // then
        null;                                // else

      // entering tag
      if (char === '<') {
        openingTag = true;

        // beginning tag
        if (nextChar !== '/') {
          object = newObject();
          object.from = pointer;

        // closing tag
        } else {
          closingTag = true;
          object.to = pointer - 1;
          addObject(object);
        }
      }

      // inside tag
      if (openingTag) {
        
        // collecting tagname
        if (!closingTag) {
          object.tag += char;

        // closing tag
        } else {

        }

      // collect text
      } else {

        // tag contents
        if (!!object) {
          for (let i = workingObjectIndex; i > -1; i--) {
            workingObjects[i].content += char;
          }
        }

        // normal
        pointer += 1;
        sanitized.push(char);
      }
      

      // leaving tag
      if (char === '>') {
        openingTag = false;
        closingTag = false;

        if (!!object) {

          // parse tag
          let m = null;

          while ((m = TAGREG.exec(object.tag)) !== null) {
            object.tagName = object.tagName || m[1];
            object.attributes = object.attributes || {};
            
            if (m[2]) { // attribute: value
              object.attributes[m[2]] = m[4] !== undefined ? m[4] : true;
            }
          }

          // self closing tag
          if (EMPTYELEMENTREG.test(object.tagName)) {
            object.isVoid = true;
            delete object.content;
            addObject(object);
          }
        }
      }

      lastChar = dirty.shift();
    }
    
    // last object is this element
    blockObject = objects.pop();
    blockObject.html = html;
    delete blockObject.from;
    delete blockObject.to;

    if (!blockObject.isVoid) {
      blockObject.content = sanitized.join('');
      blockObject.children = objects;
    }
    
    return blockObject;
  }
  
  toHTML() {
    var html = '';
    
    this.elements.forEach(blockObject => {
      var workingHTML,
        blockTags = createTags(blockObject.tagName, blockObject.attributes);
      
      // void elements
      if (blockObject.isVoid) {
        html += blockTags.open;
        return;
      }

      workingHTML = blockObject.content.split('');
      
      // empty text content
      if (workingHTML.length === 0) {
        workingHTML.push('');
      }
      
      blockObject.children.forEach(object => {
        var tags = createTags(object.tagName, object.attributes);
        
        workingHTML[object.from] = tags.open + workingHTML[object.from];
        
        // non-void elements
        if (!object.isVoid) {
          workingHTML[object.to] += tags.close;
        }
      });
      
      html += blockTags.open + workingHTML.join('') + blockTags.close;
    });
    
    return html;
  }
}

EditorSerializer.defaults = {
  outerElements: ['h2', 'h3', 'p', 'blockquote', 'figure', 'pre', 'hr', 'ul', 'ol'],
  innerElements: ['b', 'i', 'u', 'a', 'q', 'code', 'mark', 'br'],
  conversions: { 'strong': 'b', 'em': 'i' },
  stripAttributes: []
};

function createTags(tagName, attributes) {
  var tags = {
    open: `<${tagName}>`,
    close: `</${tagName}>`
  };
  
  for (let attr in attributes) {
    let val = attributes[attr];
    tags.open = tags.open.replace('>', ' ');
    
    tags.open += attr;
    
    if (!(val !== undefined && typeof val === 'boolean')) {
      tags.open += `="${val}">`;
    }
  }
  
  return tags;
}

export default EditorSerializer;  
