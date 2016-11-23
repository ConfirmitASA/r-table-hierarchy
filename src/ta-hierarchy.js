/**
 * Created by IvanP on 14.11.2016.
 */
let hierarchyCSS = require('./hierarchy.css');

import SortTable from "r-sort-table/src/sort-table";
import ReportalBase from 'r-reporal-base/src/reportal-base';
import AggregatedTable from 'r-aggregated-table/src/aggregated-table';
import TableFloatingHeader from "r-table-floating-header/src/table-floating-header";

import HierarchyBase from './hierarchy-base';
import HierarchyRowMeta from './hierarchy-row-meta';
import TableSearch from "./table-search";

class TAhierarchy extends HierarchyBase {
  constructor(options){
    let {
      source,
      hierarchy,rowheaders,flatEnabled=true,flat = false, flatNameDelimiter = '|',blocks=[], clearLinks = true, //hierarchy
      rowheaderColumnIndex=0,defaultHeaderRow,dataStripDirection='row',excludeBlock,excludeColumns,excludeRows, // aggregated Table
      sorting,
      floatingHeader,
      search
    } = options;

    super({source,
      rowheaderColumnIndex,defaultHeaderRow,dataStripDirection,excludeBlock,excludeColumns,excludeRows,
      //sorting,
      floatingHeader
    });

    //if(source){this.source=source;} else { throw new ReferenceError('`source` table is not specified for TAHierarchyTable')}
    if(hierarchy){this.hierarchy=hierarchy;} else { throw new ReferenceError('`hierarchy` is not specified for TAHierarchyTable')}
    if(rowheaders){this.rowheaders=rowheaders;} else { throw new ReferenceError('`rowheaders` are not specified for TAHierarchyTable')}
    this.column = rowheaderColumnIndex;
    this.flatNameDelimiter = flatNameDelimiter;
    this.flat = flat;

    // add class to empty hierarchy header
    let tbody = this.source.querySelector("tbody");
    this.source.querySelector(`thead>tr>td:nth-child(${this.column+1})`).classList.add('reportal-hierarchical-header');
    if(tbody.firstChild && tbody.firstChild.nodeType==3){
      tbody.removeChild(tbody.firstChild)
    }
    [this.source,this.refSource].forEach(src=>{
      if(src){
        let hh = src.querySelector(`thead>tr>td:nth-child(${this.column+1})`);
        hh.classList.add('reportal-hierarchical-header');
        if(hh.children)[].slice.call(hh.children).forEach((item)=>{item.parentNode.removeChild(item)}); //clears hierarchy toggle buttons cloned from original header
        this.addToggleButton(hh,'hierarchy-tree',false,'Tree View');
        this.addToggleButton(hh,'hierarchy-flat',true,'Flat View');
      }
    });

    this.parsed = {}; //parsed hierarchy
    this.setUpBlocks(blocks,{
      hierarchy:this.hierarchy,
      rowheaders:this.rowheaders,
      rows:[].slice.call(source.parentNode.querySelectorAll(`table#${source.id}>tbody>tr`)),
      result:this.parsed,
      clearLinks
    });

    // add correlation between data and parsed hierarchy
    TAhierarchy.mapHierarchy(this.parsed,this.data,this.multidimensional);

    // add buttons for flattened mode
    this.flat=flat;

    // initialise search
    if(search && typeof search == 'object'){
      this.search = new TableSearch(ReportalBase.mixin({
        source,
        refSource:this.refSource,
        parsed:this.parsed,
        flat:this.flat
      },search));
    }

    let _target;
    let resizeDebouncer = this.constructor.debounce(()=>this.fixedHeader.resizeFixed(),100);
    let scrollDebouncer = this.constructor.debounce(()=>this.scrollToElement(_target),50);

    ['hierarchy-collapsed','hierarchy-uncollapsed','hierarchy-tree-view','hierarchy-flat-view','sort'].forEach((eventNameChunk)=>{
      source.addEventListener(`reportal-table-${eventNameChunk}`,(e)=>{
        this.floatingHeader.resizeFixed();
        _target = e.target;
        scrollDebouncer();
        if(this.sorting && this.sorting.sortOrder.sortOrder.length>0 && (e.type=='reportal-table-hierarchy-tree-view'||e.type=='reportal-table-hierarchy-flat-view')){
          setTimeout(()=>{this.sorting.sort({})},0);
        }
      });
    });
    this.search.focusFollows(); // for search field to setup following focus


    //add sorting not passed to aggregated-table
    if(sorting && typeof sorting == 'object'){
      let reorderFunction = e=>{
        return this.onSort();
      };
      [this.source,this.refSource].forEach(target=>{
        if(target){
          target.addEventListener('reportal-table-sort', e=>this.onSort())
        }
      });

      sorting.source = this.source;
      sorting.refSource = this.refSource;
      sorting.defaultHeaderRow = defaultHeaderRow;
      sorting.data=this.data;
      sorting.multidimensional = this.multidimensional;

      /**
       *  sorting object. See {@link SortTable}
       *  @type {SortTable}
       *  @memberOf AggregatedTable
       *  */
      this.sorting = new SortTable(sorting);
      //
      if(this.sorting.columns){
        this.columns = this.sorting.columns;
      }
      // add listener to do reordering on sorting
    }
  }

  /**
   * Smooth-scrolls page so that the element that's been clicked stays ato the top of the table and compensates for scrolling header.
   * There is a flaw that the collapsed/uncollapsed event is triggered for all searching, so a debouncer is set in place, though it does scroll to the last expanded found element
   * @param {HTMLElement} el - element that triggered the event
   * */
  scrollToElement(el){
    let visible = window.pageYOffset>this.source.parentNode.offsetTop;
    var floatingHeader = visible?this.refSource.offsetHeight:0,
      offset = this.source.parentNode.offsetTop + el.offsetTop - floatingHeader;
    this.scrollTo(offset,200);

    window.setTimeout(()=>{
      if(visible!=window.pageYOffset>this.source.parentNode.offsetTop){
        this.scrollTo(this.source.parentNode.offsetTop + el.offsetTop - (window.pageYOffset>this.source.parentNode.offsetTop?this.refSource.offsetHeight:0),20)
      }
    },250);

  }

  /**
   * Implements smooth srolling
   * @param {Number} to - offset from top of the page the window needs to be scrolled to
   * @param {Number} duration - auxiliary parameter to specify scroll duration and implement easing
   * */
  scrollTo(to, duration) {
    var start = window.pageYOffset || document.documentElement.scrollTop,
      change = to - start,
      currentTime = 0,
      increment = 20;

    function animateScroll(){
      currentTime += increment;
      var val = easeInOutQuad(currentTime, start, change, duration);
      window.scrollTo(0,val);
      if(currentTime < duration) {
        requestAnimationFrame(animateScroll);
      }
    }
    requestAnimationFrame(animateScroll);

    //t = current time
    //b = start value
    //c = change in value
    //d = duration
    function easeInOutQuad (t, b, c, d) {
      t /= d/2;
      if (t < 1) return c/2*t*t + b;
      t--;
      return -c/2 * (t*(t-2) - 1) + b;
    }
  }



  /**
   * Method evoked when sorting happened. If mode is hierarchical, we want to perform hierarchical row reordering in the array before appending changes to the table. After array is ready, table rows are reordered.
   * */
  onSort(){
    if(!this.flat){ // we want to perform hierarchical row reordering in the array before appending changes to the table
      AggregatedTable.dimensionalDataIterator(this.data,this.multidimensional,(dataDimension,index)=>{
        let dataLevels = this.constructor.spliceLevel(dataDimension);
        let sortedData;
        if(this.multidimensional){
          sortedData = this.data[index];
        } else {
          sortedData = this.data; //overwrites data completely thus
        }
        sortedData.length=0;
        dataLevels[0].forEach(row=>{
          sortedData.push(row);
          TAhierarchy.reorderSorted(dataLevels,row,sortedData);
        });
      });
    }
    this.constructor.reorderRows(this.data,this.source,this.multidimensional);// finally reposition sorted rows
  }

  /**
   * Separates a `data` array into arrays dedicated to each level at index of the level
   * @param {Object} dataSource - initial `data`
   * */
  static spliceLevel(dataSource){
    let a = [];
    dataSource.forEach(dataRow=>{
      let lvl = dataRow[0].row.level;
      if(!a[lvl]){a[lvl]=[];}
      a[lvl].push(dataRow);
    });
    return a;
  }

  /**
   * Reorders rows in the sorted arrays so that the children rows follow their parent ones
   * @param {Object} source - source array,
   * @param {Array} dataRow - parent row
   * @param {Array} output - an array the rows will be appended which is a result array
   * */
  static reorderSorted(source,dataRow,output,insertAtIndex = output.length){
    let row = dataRow[0].row;
    if(row.hasChildren){
      let childLevel = source[row.level+1],
        childLevelLength = childLevel.length;
      while(childLevelLength--){
        let childRow = childLevel[childLevelLength][0].row;
        if(childRow.parent==row){
          //since we go backwards (to reduce array for the next iteration), we'll always want to add the row at `output.length`,
          // which technically is right after the parent insertion point
          output.splice(insertAtIndex,0,childLevel[childLevelLength]);
          if(childRow.hasChildren){
            TAhierarchy.reorderSorted(source,childLevel[childLevelLength],output,insertAtIndex+1);
          }
          childLevel.splice(childLevelLength,1);
        }
      }
    }
  }


  /**
   * maps hierarchy object to data object
   * */
  static mapHierarchy(parsed,data,multidimensional){
    AggregatedTable.dimensionalDataIterator(data,multidimensional,(dataDimension)=>{
      dataDimension.forEach(row=>{
        let rowId = Object.keys(parsed).filter(o=>{return parsed[o].rowIndex == row[0].rowIndex})[0];
        parsed[rowId].data = row;
        row.forEach(cell=>cell.row = parsed[rowId]);
      }); // add row to fragment in the array order, this doesn't account for column stripped data yet
    });
  }
  /**
   * Recursive function taking rows according to `hierarchy` object, adding information to that row, retrieving data from the row, and adding this array to `this.data`
   * Each item in the array has a `meta {Object}` (See {@link HierarchyTable#setupMeta}) property that has the following structure:
   *
   * ``` javascript
   * {
   *    collapsed: Boolean, // if true, the row is collapsed, defined if `hasChildren`
   *    hasChildren: Boolean, // if true, it has children
   *    flatName: String, // label for flat view ('/'-separated)
   *    name: String, // label for the current level (single-label without parent prefixes)
   *    nameCell: HTMLTableCellElement, // reference to the `<td>` element that contains the rowheader hierarchical label/name,
   *    block: String, // id of the block the row belongs to
   *    firstInBlock: Boolean, // whether the row is the first in this block, which meatns it has an extra cell at the beginning
   *    id: String, // item id from Reportal table
   *    level: Number, // hierarchy level
   *    parent: String, // parent id of the nested level
   *    row: HTMLTableRowElement // reference to the `tr` element in the table
   * }
   * ```
   *
   * @param {Array} options.hierarchy=this.hierarchy - array of hierarchy objects from Reportal
   * @param {int} options.level=0 - depth of the function
   * @param {String} options.block=null - an item from `blocks` array
   * @param {!Array} options.array - changed table for children levels
   * @return {Array}
   */
  parseHierarchy(options){
    let {hierarchy,rowheaders,level=0,block=null,result,rows,parent=null,clearLinks=false}=options;
    let blockName = null;
    if(block!==null){
      blockName = block.name.toLowerCase();
    }

    hierarchy.forEach((item,index)=>{
      let compoundID = block!==null? `${item.id}_${blockName}` : item.id; //this row is first in the block, which means it contains the first cell as a block cell and we need to indent the cell index when changing names in hierarchical column
      if(rowheaders[compoundID]){//we want to skip those which aren't in rowheaders
        let row = rows[rowheaders[compoundID].index],
          firstInBlock = row.classList.contains('firstInBlock'); //this row is first in the block, which means it contains the first cell as a block cell and we need to indent the cell index when changing names in hierarchical column
        //currentRowArray = HierarchyBase.stripRowData(row,firstInBlock,block);
        result[compoundID] = new HierarchyRowMeta({
          row,
          block: block,
          id: compoundID,
          flatName: item.text.trim(),
          name: item.name.trim(),//flatName,
          nameCell: row.children.item(block!==null ? (firstInBlock? this.column+1: this.column) : this.column),
          parent: parent,
          rowIndex: rowheaders[compoundID].index,
          level,
          collapsed: item.subcells.length > 0,
          hasChildren: item.subcells.length > 0,
          hidden: level > 0
        });

        row.classList.add("level" + level.toString());

        if(parent!=null){
          if(!parent.children)parent.children=[];
          parent.children.push(result[compoundID]);
        }

        if (level > 0 && clearLinks) {
          TAhierarchy.clearLink(row);
        }

        TAhierarchy.addCollapseButton(result[compoundID]);
        // initializes row headers according to `this.flat`
        TAhierarchy.updateCategoryLabel.call(result[compoundID],this.flat,this.column);

        if(level < 2)this.parseHierarchy({hierarchy:item.subcells, rowheaders, level:level + 1, block, rows, result, parent:result[compoundID], clearLinks});
      }
    });
  }
}



export default TAhierarchy;
