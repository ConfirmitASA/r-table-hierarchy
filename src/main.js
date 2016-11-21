/**
 * Created by IvanP on 07.09.2016.
 */

import ReportalBase from "r-reporal-base/src/reportal-base";
import TAhierarchy from "./ta-hierarchy";
import TableSearch from "./table-search";
import HierarchyBase from "./hierarchy-base";

window.Reportal = window.Reportal || {};
ReportalBase.mixin(window.Reportal,{
  HierarchyBase,
  TAhierarchy,
  TableSearch
});

export default Reportal
