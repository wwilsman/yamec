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
    this.initToolbar();
    this.addEvents();
  }

  execCommand(cmd, value, collapse) {

    // if command requires input, restore selection first
    if (value) {
      this.selection.restore();
    }

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

  initToolbar(opts) {
    // testing

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
        if (/a|code/.test(query)) {
          return this.selection.contains(query) || 
            this.selection.isWithin(query);
        }

        // headings & blockquote
        if (/h(2|3)|blockquote/.test(query)) {
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
  }

  addEvents() {
    this.dom.addEventListener('mouseup', () => {
      _.defer(() => this.showToolbar());
    });
  }

  showToolbar() {
    var boundary, toolbarHeight, toolbarHalfWidth,
      point = {};

    this.selection.save();
    
    if (this.selection.isCollapsed) {
      this.toolbar.hide();
      return;
    }

    boundary = this.selection.getRangeBoundary();
    point.x = (boundary.left + boundary.right) / 2;
    point.y = window.pageYOffset;

    this.toolbar.dom.style.display = 'block';
    toolbarHeight = this.toolbar.dom.offsetHeight;
    toolbarHalfWidth = this.toolbar.dom.offsetWidth / 2;
    this.toolbar.dom.style.display = '';

    // center focus under selection
    if (boundary.top < toolbarHeight) {
      this.toolbar.position('bottom');
      point.y += boundary.bottom;

    // center focus above selection
    } else {
      this.toolbar.position('top');
      point.y += boundary.top;
    }

    // snap to left edge
    if (point.x < toolbarHalfWidth) {
      point.x += toolbarHalfWidth - point.x;

    // snap to right edge (adjusted for scrollbar)
    } else if (window.innerWidth - _.scrollbarWidth() - point.x < toolbarHalfWidth) {
      point.x -= toolbarHalfWidth - (window.innerWidth - point.x - _.scrollbarWidth());

    }

    this.toolbar.show(point.x, point.y);
  }
}

window.Editor = Editor;

export default Editor;
