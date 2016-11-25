/**
 * Created by IvanP on 12.08.2016.
 */

import HierarchyBase from './hierarchy-base'

class LazyHierarchyFetch extends HierarchyBase{
  /**
   * @param {!HTMLTableElement} source - aggregated table with drilldown
   * @param {!Array} rowheaders - array of rowheader IDs in the order of rows in the `source` table
   * @param {!Number} hierarchyID - id of Hierarchy in Table Designer
   * @param {!String} hierarchyControlID - id of the Reportal Hierarchy Component instance on the page
   * @param {Number=} languageCode=9 - Language code (according to Confirmit table of language codes) of the language the hierarchy is going to be streamed in at the page load
   * @param {Number=} column=0 - Index of the column containing the hierarchy (0-based)
   * @param {Array=} [excludedRows=[]] - array of row-indices (0-based) to exclude from importing into the table for child levels (mostly related to totals or calculated rows necessary for viewing only at this level and would repeat themselves in hierarchical presentation, because parent row contains same information)
   * @param {String=} [pageStateID]
   * @param {Boolean} [flat=false] - Should hierarchy be rendered flatly(`true`), or in a tree-fashion (`false`).
   *
   * @param {Object} search - config for searching functionality. See {@link HierarchyTable#setupSearch}
   * @param {Boolean} search.enabled=false - flag to be set when enabling the search
   * @param {Boolean} search.immediate=false - flag to be set for serach to happen after each stroke rather than by `timeout`
   * @param {Number} search.timeout=300 - minimal time(in milliseconds) after last keystroke when searching takes place
   * @param {Boolean} [search.searching=false] - this property is mostly for internal use and is set when searching is in progress, which adds a class to the table hiding all rows not matching search
   * @param {String} [search.query=''] - search string
   * @param {HTMLInputElement} search.target - the input element that triggered the search.
   *
   * @param {Array} [data=[]] - array with data if it's passed from outside, rather than acquired from the `source` (HTML table)
   * @param {Array} [blocks=[]] - array with block ids that split hierarchies

   * */
  constructor({source, rowheaders, hierarchyID, hierarchyControlID, languageCode=9, column=0, flat = false,search={},data=[],blocks=[],excludedRows=[], pageStateID=document.getElementById('PageStateId').value}={}){
    super();
    if(source){this.source=source;} else { throw new ReferenceError('`source` table is not specified for LazyHierarchyFetch')}
    if(rowheaders){this.rowheaders = rowheaders;} else { throw new ReferenceError('`rowheaders` are not specified for LazyHierarchyFetch')}
    if(hierarchyID){this.hierarchyID=hierarchyID;} else { throw new ReferenceError('`hierarchyID` is not specified for LazyHierarchyFetch')}
    if(hierarchyControlID){this.hierarchyControlID = hierarchyControlID;} else { throw new ReferenceError('`hierarchyControlID` is not specified for LazyHierarchyFetch')}
    this.blocks = blocks;
    this.languageCode = languageCode;
    if(excludedRows && Array.isArray(excludedRows)){this.excludedRows=excludedRows;} else {throw new ReferenceError('`excludedRows` must be an `Array`')}
    this.column=column;
    this.pageStateID = pageStateID;
    this.dataTableID = source.querySelector('[data-table-id]').getAttribute('data-table-id');
    this.data = this.setUpBlocks(data,blocks);
    // set up event delegation to the table to listen to expanding of rows to trigger row drilldown
    this.setUpExpandListener();
    this.flat = flat;
    this.search = this.setupSearch(search);

    this.hierarchy = {};
  }

  /**
   * Recursive function taking rows from each `block` and adding information to that row, retrieving data from the row, and adding this array to `this.data[block]`
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
   * @param {Array} hierarchy=this.hierarchy - array of hierarchy objects from Reportal
   * @param {int} level=0 - depth of the function
   * @param {String} block=null - an item from `blocks` array
   * @param {!Array} array - changed table for children levels
   * @return {Array}
   *
   */

  parseHierarchy({level=0,rows,block=null,array,parent=null}={}){
    [].slice.call(this.source.parentNode.querySelectorAll(`table#${this.source.id}>tbody>tr`)).forEach((row,index)=>{
      var data = HierarchyBase.stripRowData(row,(block!==null && row.rowIndex == block.cell.parentNode.rowIndex), block);
      array.push(data);
      var id = this.rowheaders[index][0];
      if(this.excludedRows.indexOf(index)==-1){
        this.parseHierarchyRow({row, id,  data, array, level, block, parent}, true);
      }
    });

  }

  /**
   * Parses a row in the hierarchy, sets up its meta and fetches childrent of the row if necessary
   * @param {HTMLTableRowElement} row  - table row to be parsed
   * @param {String} id - id of the row
   * @param {Array} data - row data
   * @param {Array} array - array of row datas within a block
   * @param {Number} level=0 - level in hierarchy
   * @param {?Object} block - block in which the row is contained if any
   * @param {?Object} parent - parent row of the row in question
   * @param {Boolean=} [getChildren=false] - flag to fetch children of a row in question
   * @param {Boolean=} [isSecondFetch=false] - flag denoting that it's the second time this function is run on the row and there's no need to construct meta for it
   * */
  parseHierarchyRow({row, id,  data, array, level=0, block,parent=null}={}, getChildren=false, isSecondFetch = false){
    let blockName = null, firstInBlock = false;
    if(block!==null){
      blockName = block.name.toLowerCase();
      firstInBlock = row.rowIndex === block.cell.parentNode.rowIndex; //this row is first in the block, which means it contains the first cell as a block cell and we need to indent the cell index when changing names in hierarchical column
    }
    if(!isSecondFetch){
      row.classList.add("level" + level.toString());
      if(!data.meta){
        //build a prototype for a row
        let nameCell = row.children.item(block!==null ? (firstInBlock? this.column: this.column-1) : this.column);
        data.meta = new this.setupMeta({
          row,
          id,
          level,
          block: block,
          nameCell: nameCell,
          parent: parent,
          name: nameCell.textContent.trim(),
          flatName: nameCell.textContent.trim()
        });
        this.fixDrilldownLink(data.meta); //disable native drilldown and add our own.
      }
      // we want to add the child to the parent for quick access to all children of the parent
      if(data.meta.parent!=null){
        data.meta.parent.meta.children.push(data);
      }
      // initializes row headers according to `this.flat`
      //this.updateCategoryLabel(data);
      this.constructor.addCollapseButton(data.meta);
      this.constructor.rowIsLoading(data.meta, true);
    }
    // check for child availability
    if(getChildren) {
      // TODO:add loading progress

      let fetchChildHierarchy = this.fetchChildHierarchy(data.meta.id);
      fetchChildHierarchy.then(childHierarchy => {
        if(childHierarchy.length > 0){ // this row has children
        //TODO: add a toggle node
        // adds a toggle button
        data.meta.hasChildren = true;


        //data.meta.collapsed = true;
        //query for children of this level only
        let fetchChildRows = this.fetchChildRows(data.meta.id, data.meta.parent!=null? data.meta.parent.meta.id:null, this.dataTableID);

        fetchChildRows.then(childRows => {
          data.meta.children = [];

        // find next row after parent before which to add child rows
        let nextRow = row.nextSibling;
        while (nextRow && nextRow.nodeType != 1) {
          nextRow = nextRow.nextSibling;
        }

        childRows.forEach((childRow, index) => {
          let currentRowData = HierarchyBase.stripRowData(childRow, firstInBlock);

          //data.meta.children.push(currentRowData);

          array.splice(array.indexOf(data)+1+index, 0, currentRowData);
          // TODO: add row processing as above
          // append rows after parent row
          this.source.querySelector('tbody').insertBefore(childRow, nextRow);
          this.parseHierarchyRow({row: childRow, id: childHierarchy[index].id,  data:currentRowData, array, level: data.meta.level+1, block, parent: data});
        });
        data.meta.collapsed = true;
        this.constructor.rowIsLoading(data.meta, false);
      });

        //TODO: add listener for toggle opening to repeat process for open items
      } else {
        //TODO: add class to display empty bullet denothing there are no children
        data.meta.hasChildren = false;
        data.meta.children=null;
        this.constructor.rowIsLoading(data.meta, false);
      }

    });
    }
  }

  /**
   * Listens for a row to be expanded on table and when it's expanded executes `parseHierarchyRow` on the row to fetch its children
   * */
  setUpExpandListener(){
    this.source.addEventListener('reportal-table-hierarchy-uncollapsed', e=>{
      this.data.forEach(block=>{
      let expandedRow = block.find(row=>row.meta && row.meta.row == e.target);
    if(expandedRow.meta.children.length>0 && expandedRow.meta.children[0].meta.hasChildren==undefined){ //children have never been queried for hierarchy
      expandedRow.meta.children.forEach(child=>{this.parseHierarchyRow({row: child.meta.row, data:child, array:block, level: child.meta.level, block: child.meta.block},true,true);});
    }
  })
  });
  }

  /**
   * decorator function adding a kind of spinner to the rows that are still fetching data
   * */
  static rowIsLoading(meta, display){
    display? meta.row.classList.add('reportal-row-loading'): meta.row.classList.remove('reportal-row-loading');
  }

  /**
   * Queries if each row might contain child rows by quering hierarchy for next level
   * */
  fetchChildHierarchy(id){
    let path = [
      location.origin,
      'reportal',
      'Hierarchy',
      this.constructor.getQueryVariable('ReportId'),
      this.hierarchyID,
      this.languageCode,
      'GetChildNodes'
    ];

    let query=[
      `nodeId=${id}`,
      `info=${encodeURIComponent(JSON.stringify({IsPreview:this.constructor.getQueryVariable('Preview')==='true',HierarchyControlId:this.hierarchyControlID}))}`,
      'isRepBase=false',
      'parameter=',
      `PageStateId=${this.pageStateID}`
    ];

    var hierarchyItemChildren = HierarchyBase.promiseRequest([path.join('/'),'?',query.join('&')].join(''));
    return hierarchyItemChildren.then(response=>{return Promise.resolve(JSON.parse(response))});
  }

  /**
   * Gets row nodes that are child to the parent row#`id`
   * @param {!String} id - rowheader id for current row
   * @param {?String} parentID - rowheader id for parent row
   * @param {!String} tableID - Reportal Aggregated Table Component id
   * @return {Promise} Returns a thenable promise which result is an array of `HTMLTableRowElement`s child to the row#`id`
   * */
  fetchChildRows(id, parentID, tableID){
    parentID = parentID!=null?parentID:id;
    let path = [
      location.origin,
      'reportal',
      'Report',
      this.constructor.getQueryVariable('ReportId'),
      'Component',
      tableID
    ];
    let query=[
      `PageId=${this.constructor.getQueryVariable('PageId')}`,
      `Preview=${this.constructor.getQueryVariable('Preview')}`,
      `PageStateId=${this.pageStateID}`,
      `pageFilters=${encodeURIComponent(JSON.stringify({}))}`,
      `customFilters=${encodeURIComponent(JSON.stringify({}))}`,
      `persNodes=${encodeURIComponent(JSON.stringify([{NodeId:id,Text:null}]))}`, // child node id
      `origNodes=${encodeURIComponent(JSON.stringify([{NodeId:parentID,Text:null}]))}` // parent node id
    ];
    var tableResult = HierarchyBase.promiseRequest([path.join('/'),'?',query.join('&')].join(''));
    return tableResult.then(response=>{return Promise.resolve(this.constructor.stripRowsFromResponseTable(response, this.excludedRows))});
  }

  /**
   * Strips rows from the table received
   * @param {String} response - string representation of Aggregated table
   * @return {Array} Returns an array of rows {HTMLTableRowElement}
   * */
  static stripRowsFromResponseTable(response,excludedRows){
    let hostnode = document.createElement('span');
    hostnode.innerHTML=response;
    let rows = [].slice.call(hostnode.querySelectorAll('table>tbody>tr'));
    if(excludedRows && excludedRows.length>0){
      excludedRows.reverse().forEach(index=>{
        rows.splice(index, 1);
    });
    }
    return rows;
  }

  /**
   * Disables native drilldown and simulated hierarchy component selection, since that would be the behavior of a drilldown on a component
   * @param {Object} meta - meta object on the row.
   * */
  fixDrilldownLink(meta){
    var a = meta.nameCell.querySelector('.tbl-dd-trigger');
    a.classList.remove('tbl-dd-trigger');
    a.addEventListener('click',e=>this.triggerDrilldown(meta.id));
  }

  /**
   * triggers drilldown on a link click for hierarchy level with id = `id`
   * @param {String} id - id in hierarchy
   * */
  triggerDrilldown(id){
    var hierarchyTargetID = [].slice.call(document.querySelectorAll('input[name*=_hierarchyid]')).find(input=>input.value=this.hierarchyID).id.split('_')[0];
    var nodeIdInput = document.querySelector(`#${hierarchyTargetID}_selnodeid`);
    var eventTarget = nodeIdInput.parentNode.querySelector('#__EVENTTARGET');
    nodeIdInput.value=JSON.stringify([id]);
    eventTarget.value=`${hierarchyTargetID}_trigger`;
    window.viewmode?window.viewmode.submit():null;
  }
}

export default LazyHierarchyFetch
