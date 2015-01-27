import _ from './helpers';
import Selection from './selection';
import EditorToolbar from './editor-toolbar';

class Editor {
  constructor(el) {
    if (typeof el === 'string') {
      el = document.querySelectorAll(el);
    }

    if (!_.isElement(el)) {
      return _.slice.call(el).map(e => {
        return new Editor(e);
      });
    }

    this.dom = el;
    this.dom.setAttribute('contentEditable', true);

    this.selection = new Selection();
    this.commands = {};
    this.events = {};

    this.initToolbar()
        .addEvents();
  }

  // returns the element the cursor is within
  getContext() {
    var ctxElement = this.selection.range.commonAncestorContainer;

    // we want to return an element
    while (ctxElement.nodeType !== 1) {
      ctxElement = ctxElement.parentNode;
    }

    return ctxElement;
  }

  // registers a command (or commands)
  registerCommand(cmds/*, func*/) {

    // if `cmds` is a a string, turn arguments into an object
    if (typeof cmds === 'string') {
      let cmd = cmds, func = arguments[1];
      (cmds = {})[cmd] = func;
    }

    // add commands
    for (let cmd of _.keys(cmds)) {
      this.commands[cmd] = this.commands[cmd] || [];
      this.commands[cmd].push(cmds[cmd]);
    }
  }

  // unregisters a command
  unregisterCommand(cmd, func) {
    var cmds, index;

    if (cmds = this.commands[cmd]) {

      // delete all if `func` not passed
      if (func === undefined) {
        delete this.commands[cmd];

      // delete specific function if it exists
      } else if ((index = cmds.indexOf(func)) !== -1) {
        cmds.splice(index, 1);

        // remove from `commands` if empty
        if (cmds.length === 0) {
          delete this.commands[cmd];
        }
      }
    }
  }

  // preforms the command (`document.execCommand` by default)
  execCommand(cmd, value, collapse) {

    // restore selection first (in case command required input)
    this.selection.restore();

    // defer command to wait for selection to restore
    _.defer(() => {

      // call custom commands
      if (this.commands[cmd]) {
        for (let func of this.commands[cmd]) {
          func.apply(this, [value, cmd]);
        }

      // `document.execCommand` by default
      } else {
        document.execCommand(cmd, false, value);
      }

      // collapse selection and hide toolbar
      if (collapse) {
        this.selection.collapseToEnd();
        this.toolbar.hide();

      // reposition the toolbar
      } else {
        this.showToolbar();
      }
    });
  }

  // add event listeners
  on(names, func) {

    // split names into an array
    names = names.split(' ');

    // add events
    for (let name of names) {
      this.events[name] = this.events[name] || [];
      this.events[name].push(func);
    }

    return this;
  }

  // remove event listeners
  off(names, func) {
    var funcs, index;

    // split names into an array
    names = names.split(' ');

    for (let name of names) { 
      if (funcs = this.events[name]) {

        // delete all if `func` not passed
        if (func === undefined) {
          delete this.events[name];

        // delete specific function if it exists
        } else if ((index = funcs.indexOf(func)) !== -1) {
          funcs.splice(index, 1);

          // remove from `events` if empty
          if (funcs.length === 0) {
            delete this.events[name];
          }
        }
      }
    }

    return this;
  }

  // trigger events attached to the editor
  trigger(name) {
    var funcs;

    if (funcs = this.events[name]) {
      for (let func of funcs) {
        func.apply(this, _.slice(arguments, 1));
      }
    }

    return this;
  }

  // hook into DOM events and set some defaults
  addEvents() {
    var

      // wrapper to trigger editor events
      fireEvent = event => {
        this.trigger(event.type, event);
      },

      // DOM events to hook into
      domEvents = [
        'mouseup', 'mousedown', 'click',
        'mouseover', 'mouseout',
        'keyup', 'keydown', 'keypress', 
        'focus', 'blur'
      ];

    // hook into DOM events
    for (let evt of domEvents) {
      this.dom.addEventListener(evt, fireEvent);
    }

    // default events

    // show toolbar when a selection might be made
    this.on('mouseup keyup', this.showToolbar);

    return this;
  }

  // registers some default commands and initializes the toolbar
  initToolbar(opts) {

    // register some helpful commands
    this.registerCommand({

      // toggle link action
      'toggleLink': function () {
        var els;

        // remove closest link
        if ((els = this.selection.isWithin('a'))) {
          els.forEach(_.unwrap);
          this.selection.restore();

        // unlink selected link
        } else if (this.selection.contains('a')) {
          this.execCommand('unlink');

        // show input to create link
        } else {
          this.toolbar.toggleInput('http://...', (value) => {
            this.execCommand('createLink', value, !!value);
          });
        }
      },

      'toggleBlock': function (tagName) {

        // format as paragraph
        if (this.selection.isWithin(tagName)) {
          this.execCommand('formatBlock', 'p');

        // format as `tagName`
        } else {
          this.execCommand('formatBlock', tagName);
        }
      },

      'toggleTag': function (tagName) {
        var els;

        // remove closest matching tag
        if ((els = this.selection.isWithin(tagName))) {
          // TODO: 
          //   Instead of stripping the tag, break selection out of tag like 
          //   bold/italic default behavior.
          els.forEach(_.unwrap);
          this.selection.restore();

        // remove inner tags
        } else if (this.selection.contains(tagName)) {
          let reg = new RegExp('<' + tagName + '(.*?)>|</' + tagName + '>', 'g');
          this.selection.replace(this.selection.html.replace(reg, ''));

        // wrap with tag
        } else {
          this.selection.replace(`<${tagName}>${this.selection.html}</${tagName}>`);
        }
      }
    });

    // testing

    var commandWrapper = (cmd, value) => {
      return () => {
        return this.execCommand(cmd, value);
      };
    };

    var queryWrapper = query => {
      return () => {

        // force active state
        if (typeof query === 'boolean') {
          return query;
        }

        // links & code
        if (/^(a|code)$/.test(query)) {
          return this.selection.contains(query) || 
            this.selection.isWithin(query);
        }

        // headings & blockquote
        if (/^(h(2|3)|blockquote)$/.test(query)) {
          return this.selection.isWithin(query);
        }

        // default
        return document.queryCommandState(query);
      };
    };
    
    this.toolbar = new EditorToolbar({
      onInputCancel: () => {
        this.selection.restore();
      },

      buttons: [{
        content: 'B',
        action: commandWrapper('bold'),
        active: queryWrapper('bold')
      }, {
        content: 'I',
        action: commandWrapper('italic'),
        active: queryWrapper('italic')
      }, {
        content: 'A',
        action: commandWrapper('toggleLink'),
        active: queryWrapper('a')
      }, {
        content: 'H1',
        action: commandWrapper('toggleBlock', 'h2'),
        active: queryWrapper('h2')
      }, {
        content: 'H2',
        action: commandWrapper('toggleBlock', 'h3'),
        active: queryWrapper('h3')
      }, {
        content: '"',
        action: commandWrapper('toggleBlock', 'blockquote'),
        active: queryWrapper('blockquote')
      }, {
        content: '&lt;/&gt;',
        action: commandWrapper('toggleTag', 'code'),
        active: queryWrapper('code')
      }]
    });

    return this;
  }

  // shows the toolbar (hides if no selection)
  // TODO: add context argument to show/hide different toolbars
  showToolbar() {
    var boundary, toolbarHeight, toolbarHalfWidth,
      point = {};

    // save selection in case focus changes later
    this.selection.save();
    
    // hide the toolbar if nothing is selected
    if (this.selection.isCollapsed) {
      this.toolbar.hide();
      return;
    }

    // get starting points for toolbar
    boundary = this.selection.getRangeBoundary();
    point.x = (boundary.left + boundary.right) / 2;
    point.y = window.pageYOffset;

    // get dimensions of toolbar
    this.toolbar.dom.style.display = 'block';
    toolbarHeight = this.toolbar.dom.offsetHeight;
    toolbarHalfWidth = this.toolbar.dom.offsetWidth / 2;
    this.toolbar.dom.style.display = '';

    // center toolbar under selection
    if (boundary.top < toolbarHeight) {
      this.toolbar.position('bottom');
      point.y += boundary.bottom;

    // center toolbar above selection
    } else {
      this.toolbar.position('top');
      point.y += boundary.top;
    }

    // snap toolbar to left edge
    if (point.x < toolbarHalfWidth) {
      point.x += toolbarHalfWidth - point.x;

    // snap toolbar to right edge (adjusted for scrollbar)
    } else if (window.innerWidth - _.scrollbarWidth() - point.x < toolbarHalfWidth) {
      point.x -= toolbarHalfWidth - (window.innerWidth - point.x - _.scrollbarWidth());
    }

    // show toolbar
    this.toolbar.show(point.x, point.y);
  }
}

window.Editor = Editor;

export default Editor;
