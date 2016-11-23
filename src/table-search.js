/**
 * Created by IvanP on 16.11.2016.
 */
import Highlight from 'r-highlight/src/main';
import HierarchyBase from './hierarchy-base';
import AggregatedTable from 'r-aggregated-table/src/aggregated-table';
import HierarchyRowMeta from './hierarchy-row-meta';


/**
 * This class initializes a prototype for search functionality for hierarchical column
 * @param {Boolean} enabled=false - flag to be set when enabling the search
 * @param {Boolean} immediate=false - flag to be set for serach to happen after each stroke rather than by `timeout`
 * @param {Number} timeout=300 - minimal time(in milliseconds) after last keystroke when searching takes place
 * @param {Boolean} [searching=false] - this property is mostly for internal use and is set when searching is in progress, which adds a class to the table hiding all rows not matching search
 * @param {String} [query=''] - search string
 * @param {HTMLInputElement} target - the input element that triggered the search.
 * @param {Boolean} [visible=false] - search box is visible
 * @param {Boolean} [highlight=true] - search matches will be highlighted
 * */
export default class TableSearch{
  constructor(options){
    let {source, refSource, immediate = false, timeout=300, searching=false, query='', target=null, visible=false, highlight=true, placeholder = 'Search categories...', parsed, flat} = options;
    this.source = source;
    this.refSource = refSource;
    this.timeout = timeout;
    this.immediate = immediate;
    this.searching = searching;
    this.visible = visible;
    [source,refSource].forEach(src=>{
      this.addSearchBox(src.querySelector('.reportal-hierarchical-header'), placeholder)
    });
    this.inputs = [].slice.call(source.parentNode.querySelectorAll('.reportal-hierarchical-header input'));
    this.query = query;
    this.target = target;
    this.highlight = highlight? new Highlight({element:[].slice.call(source.querySelectorAll('.reportal-hierarchical-cell')),type:'open'}) : null;
    // initialize searchfield on element
    this.parsed = parsed;
    this.flat = flat;
  }

  set query(val){
    if(val.length==0 && this.highlight){
      this.highlight.remove();
    } // clear highlighting when query length is 0
    this._query = val;
    this.inputs.forEach(input=>{
        input.value = val;
    });
  }
  get query(){
    return this._query;
  }

  get visible(){return this._visible}
  set visible(val){
    [].slice.call(this.source.parentNode.querySelectorAll('.hierarchy-search')).forEach(button=>{
      if(val){
        button.classList.add('visible');
        button.parentNode.classList.add('hierarchy-search-visible'); //to hide sorting arrow because it overlaps the search field
      }else{
        button.classList.remove('visible');
        button.parentNode.classList.remove('hierarchy-search-visible');
      }
    });
    this._visible = val;
  }

  get searching(){return this._searching}
  set searching(val){
    val?this.source.classList.add('reportal-hierarchy-searching'):this.source.classList.remove('reportal-hierarchy-searching');
    if(!val){
      HierarchyBase.collapseAll(this.parsed); // we want to collapse all expanded rows that could be expanded during search
    }
    this._searching = val;
  }

  /**
   * Nulls search and redoes it, used in toggling between `flat` and `tree` views in hierarchy, necessary because the search is done on different name strings
   * */
  clearSearch(){
    this.target = null;
    this.query = '';
    this.visible = false;
    this.searching = false;
    this.inputs.forEach(input=>input.value = '');
  }

  /**
   * Updates `search.target` && `search.query` in `hierarchy.search` to know which input triggered the search and update the `search.query` in the other
   * @param {Event} e - a debounced event triggered by input field when a person enters text
   * */
  updateSearchTarget(e){
    this.target = e.target;
    this.query = e.target.value;
  }

  /**
   * Adds a search icon and a search box to the header of the hierarchy column (`host`)
   * @param {HTMLTableCellElement} host - header of the hierarchy column
   * @param {String} placeholder - Placeholder text in the searchfield
   * */
  addSearchBox(host,placeholder){
    let button = document.createElement('span'),
      buttonContainer = document.createElement('span'),
      clearButton = document.createElement('span'),
      searchfield = document.createElement('input');

    searchfield.type='text';
    button.classList.add('icon-search');
    clearButton.classList.add('icon-add');
    clearButton.classList.add('clear-button');
    buttonContainer.classList.add('btn');
    buttonContainer.classList.add('hierarchy-search');

    //listener to display search field on search-icon click
    button.addEventListener('click',e=>{
      if(!this.visible){this.visible = true;}
      e.target.parentNode.querySelector('input').focus();
    });

    //listener to display search field on search-icon click
    clearButton.addEventListener('click',e=>{
      this.clearSearch();
    });

    buttonContainer.title = searchfield.placeholder = placeholder;

    let efficientSearch = this.search();
    //TODO: add cursor following the header (if a floating header appeared, cursor must focus there)
    searchfield.addEventListener('keyup',e=>{
      this.updateSearchTarget(e); //update search parameters
      efficientSearch();          // call search less frequently
    });

    searchfield.addEventListener('blur',e=>{
      if(e.target.value.length==0)this.clearSearch(); //update search parameters
    });

    buttonContainer.appendChild(button);
    buttonContainer.appendChild(searchfield);
    buttonContainer.appendChild(clearButton);
    host.appendChild(buttonContainer);
  }

  /**
   * Wrapping function that debounces search, sets `search.searching` [(click for info)]{@link HierarchyTable#setupSearch} and calls `hierarchy.searchRowheaders` [(click for info)]{@link HierarchyTable#searchRowheaders}
   * @return {Function}
   * */
  search(){
    return HierarchyBase.debounce(()=>{
      let value = this.query;
      if(value.length>0){
        if(!this.searching){this.searching=true;}
        this.searchRowheaders(value);
      } else {
        this.searching=false;
      }
    }, this.timeout, this.immediate);
  }

  /**
   * This function runs through the data and looks for a match in `row.meta.flatName` (for flat view) or `row.meta.name` (for tree view) against the `str`.
   * @this HierarchyBase
   * @param {String} str - expression to match against (is contained in `this.search.query`)
   * */
  searchRowheaders(str){
    HierarchyBase.collapseAll(this.parsed); //null search
    let regexp = new RegExp('('+str+')','i');
    for(let id in this.parsed){
      let row = this.parsed[id];
      if(this.flat){
        row.matches=regexp.test(row.flatName);
        row.hidden=false;
      } else {
        // if it has a parent and maybe not matches and the parent has match, then let it and its children be displayed
        let matches = regexp.test(row.name);
        if(row.parent!=null && !matches && row.parent.matches){
          // just in case it's been covered in previous iteration
          if(!row.matches){row.matches=true}
          else if(row.hasChildren && !row.collapsed){
            row.collapsed=true; //if a parent row is uncollapsed and has a match, but the current item used to be a match and was uncollapsed but now is not a match
          }
          row.hidden=row.parent.collapsed;
        } else { // if has no parent or parent not matched let's test it, maybe it can have a match, if so, display his parents and children
          row.matches=matches;
          if(matches){
            row.uncollapseParents();
          }
        }
      }
    }
    if(this.highlight)this.highlight.apply(str);
  }



  /**
   * Allows focus to follow from a search field into floating header and back when header disappears.
   * */
  focusFollows(){
    if(this.refSource){
      ['visible','hidden'].forEach(eventChunk=>{
        this.source.addEventListener(`reportal-fixed-header-${eventChunk}`,()=>{
          if(this.searching && document.activeElement && this.inputs.indexOf(document.activeElement)!=-1){
            this.inputs.forEach(input=>{
              if(input!=document.activeElement){
                input.focus();
                this.target=input;
              }
            });
          }
        })
      });
    }
  }
}
