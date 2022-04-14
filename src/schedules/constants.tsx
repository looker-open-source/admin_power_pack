/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2020 Looker Data Sciences, Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import {
  IDashboard,
  IScheduledPlan,
  IScheduledPlanDestination,
  IUserPublic,
  IWriteScheduledPlan,
} from "@looker/sdk/lib/4.0/models";

export const DEBUG = process.env.NODE_ENV === "development";

////////////////////// Interfaces //////////////////////

// ExtensionState for SchedulesPage
export interface ExtensionState {
  currentDash?: IDashboard;
  selectedDashId: string;
  dashSearchString: string;
  dashboards: any[]; // array of dashboard and folder names/ids for Select
  datagroups: SelectOption[]; // array of datagroup string names
  users: SelectOption[]; // array of user ids and display names
  schedulesArray: any; // IScheduledPlanTable[] - array of schedules (can be edited)
  schedulesArrayBackup: any; // IScheduledPlanTable[] - array of schedules stored for reverting edits
  runningQuery: boolean; // false shows 'getting data', true displays table
  runningUpdate: boolean; // false shows 'getting data', true displays table
  hiddenColumns: string[]; // state of column headers to control visibility
  checkboxStatus: any;
  errorMessage?: string;
  notificationMessage?: string;
  toggleLog: boolean; // log output dialog
  logMessages: string[]; // log output array of strings
}

// need this to supply null values (--strictNullChecks)
export interface IWriteScheduledPlanNulls extends IWriteScheduledPlan {
  crontab?: any;
  datagroup?: any;
  run_as_recipient?: any;
  include_links?: any;
  long_tables?: any;
  pdf_paper_size?: any;
}

// used to display specific fields for all schedules on a Dashboard
export interface IScheduledPlanTable extends IScheduledPlan {
  owner_id: string;
  recipients: string[];
  run_as_recipient?: any;
  include_links?: any;
  [key: string]: any; // needed to dynamically display filters
  scheduled_plan_destination: IScheduledPlanDestination[]; // overriding to make this required
  user: IUserPublic;
}

// for Select Dropdown, generic list - no options[]
export interface SelectOption {
  label: string;
  value: string;
}

// for Select Dropdown with grouping options[]
export interface GroupSelectOption {
  label: string;
  options: SelectOption[];
}

// Schedules Table query props
export interface SchedulesTableQueryProps {
  results: IScheduledPlanTable;
  datagroups: SelectOption[];
  users: SelectOption[];
  hiddenColumns: string[];
  checkboxStatus: any;
  handleVisible(hiddenColumns: string[], checkboxStatus: any): void;
  syncData(index: number, id: string, value: string): any;
  addRow(): void;
  deleteRow(rows: any[]): void;
  updateRow(rowIndex: number[], rows: any[]): void;
  testRow(rowIndex: number[], rows: any[]): void;
  disableRow(rowIndex: number[], rows: any[]): void;
  enableRow(rowIndex: number[], rows: any[]): void;
  openExploreDrillWindow(scheduledPlanID: number): void;
  openDashboardWindow(rowIndex: number): void;
  toggleLog(): void;
}

// Editable Cell base for all cells in table
export interface EditableCellProps {
  value: any; // (string | number | boolean)
  row: { index: number };
  column: { id: string };
  data: any;
  datagroups: SelectOption[];
  users: SelectOption[];
  openExploreDrillWindow(scheduledPlanID: number): void;
  openDashboardWindow(rowIndex: number): void;
  syncData(rowIndex: number, columnId: string, value: string): any;
}

// for handleGenPlansSubmit function
export interface GeneratePlansProps {
  users: SelectOption[];
  toggleLog(): void;
  handleGeneratePlansSubmit(
    querySlug: string,
    ownerID: string,
    scheduleName: string,
    scheduleCron: string
  ): void;
}

// for Global Action functions
export interface GlobalActionQueryProps {
  users: SelectOption[];
  toggleLog(): void;
  openExploreWindow(): void;
  GlobalReassignOwnership(UserMapFrom: string[], UserMapTo: string): void;
  GlobalFindReplaceEmail(EmailMap: string): void;
  GlobalValidateRecentSchedules(timeframe: string): any;
  GlobalResendRecentFailures(failureData: any): void;
  GlobalSelectByQuery(querySlug: string): any;
  GlobalSelectByQueryRun(scheduledPlansData: any, action: string): void;
}

//////////////// Order for table Headings ////////////////

export const TABLE_HEADING = [
  {
    Header: "Details",
    accessor: "details",
  },
  {
    Header: "Owner ID",
    accessor: "owner_id",
  },
  {
    Header: "Name",
    accessor: "name",
  },
  {
    Header: "Crontab",
    accessor: "crontab",
  },
  {
    Header: "Datagroup",
    accessor: "datagroup",
  },
  {
    Header: "Recipients",
    accessor: "recipients",
  },
  {
    Header: "Message",
    accessor: "message",
  },
  {
    Header: "Run As Recipient",
    accessor: "run_as_recipient",
  },
  {
    Header: "Include Links",
    accessor: "include_links",
  },
  {
    Header: "Timezone",
    accessor: "timezone",
  },
  {
    Header: "Format",
    accessor: "format",
  },
  {
    Header: "Apply Vis",
    accessor: "apply_vis",
  },
  {
    Header: "Apply Formatting",
    accessor: "apply_formatting",
  },
  {
    Header: "Expand Tables",
    accessor: "long_tables",
  },
  {
    Header: "Paper Size",
    accessor: "pdf_paper_size",
  },
  {
    Header: "Landscape",
    accessor: "pdf_landscape",
  },
];

//////////////// ACTION LIST FAILURE RESULTS COLUMNS  ////////////////

export const ACTION_LIST_FAIL_COLUMNS = [
  {
    id: "scheduled_plan.id",
    // type: 'number',
    title: "Plan ID",
    widthPercent: 5,
  },
  {
    id: "scheduled_job.name",
    // type: 'string',
    title: "Name",
    widthPercent: 10,
  },
  {
    id: "scheduled_job.id",
    // type: 'number',
    primaryKey: true,
    title: "Job ID",
    widthPercent: 5,
  },
  {
    id: "scheduled_job.finalized_time",
    // type: 'string',
    title: "Finalized Time",
    widthPercent: 12,
  },
  {
    id: "user.name",
    // type: 'string',
    title: "Owner",
    widthPercent: 10,
  },
  {
    id: "scheduled_job.status_detail",
    // type: 'string',
    title: "Status Detail",
    widthPercent: 30,
  },
  {
    id: "scheduled_plan.content_type_id",
    // type: 'string',
    title: "Content Type ID",
    widthPercent: 10,
  },
  {
    id: "scheduled_plan.destination_addresses",
    // type: "string",
    title: "Destination Addresses",
    widthPercent: 18,
  },
];

//////////////// ACTION LIST SELECT BY QUERY COLUMNS  ////////////////

export const ACTION_LIST_SELECT_BY_QUERY_COLUMNS = [
  {
    id: "scheduled_plan.id",
    // type: 'number',
    primaryKey: true,
    title: "Plan ID",
    widthPercent: 5,
  },
  {
    id: "scheduled_plan.name",
    // type: 'string',
    title: "Name",
    widthPercent: 10,
  },
  {
    id: "scheduled_plan.enabled",
    // type: 'string',
    title: "Enabled",
    widthPercent: 6,
  },
  {
    id: "scheduled_plan.run_once",
    // type: 'string',
    title: "Run Once",
    widthPercent: 7,
  },
  {
    id: "scheduled_times",
    // type: 'string',
    title: "Scheduled Times",
    widthPercent: 20,
  },
  {
    id: "user.name",
    // type: 'string',
    title: "Owner",
    widthPercent: 10,
  },
  {
    id: "summary",
    // type: 'string',
    title: "Summary",
    widthPercent: 12,
  },
  {
    id: "scheduled_plan.content_type_id",
    // type: 'string',
    title: "Content Type ID",
    widthPercent: 10,
  },
  {
    id: "scheduled_plan.destination_addresses",
    // type: "string",
    title: "Destination Addresses",
    widthPercent: 20,
  },
];

//////////////// FIELD LISTS  ////////////////

export const READ_ONLY_FIELDS = ["details"];

export const REQUIRED_FIELDS = ["owner_id", "name", "recipients"];

export const REQUIRED_TRIGGER_FIELDS = ["crontab", "datagroup"];

export const ADVANCED_FIELDS = [
  "message",
  "run_as_recipient",
  "include_links",
  "timezone",
  "format",
];

export const FORMATTING_FIELDS = [
  "apply_formatting",
  "apply_vis",
  "long_tables",
  "pdf_landscape",
  "pdf_paper_size",
];

export const KEY_FIELDS = [
  ...READ_ONLY_FIELDS,
  ...REQUIRED_FIELDS,
  ...REQUIRED_TRIGGER_FIELDS,
  ...ADVANCED_FIELDS,
  ...FORMATTING_FIELDS,
];

//////////////// SELECT OPTIONS  ////////////////

export const FORMAT = [
  { value: "wysiwyg_pdf", label: "PDF" },
  { value: "wysiwyg_png", label: "Visualization" },
  { value: "csv_zip", label: "CSV ZIP file" },
  { value: "assembled_pdf", label: "PDF - Single Column Layout" },
  { value: "inline_visualizations", label: "Vis - Single Column Layout" },
];

export const PDF_PAPER_SIZE = [
  { value: "", label: "Fit Page to Dashboard" },
  { value: "letter", label: "Letter" },
  { value: "legal", label: "Legal" },
  { value: "tabloid", label: "Tabloid" },
  { value: "a0", label: "A0" },
  { value: "a1", label: "A1" },
  { value: "a2", label: "A2" },
  { value: "a3", label: "A3" },
  { value: "a4", label: "A4" },
  { value: "a5", label: "A5" },
];

export const TIMEZONES = [
  {
    label: "UTC",
    options: [{ value: "UTC", label: "UTC" }],
  },

  {
    label: "United States Timezones",
    options: [
      {
        value: "America/Chicago",
        label: "America - Chicago",
      },
      {
        value: "America/Denver",
        label: "America - Denver",
      },
      {
        value: "America/Juneau",
        label: "America - Juneau",
      },
      {
        value: "America/Los_Angeles",
        label: "America - Los Angeles",
      },
      {
        value: "America/New_York",
        label: "America - New York",
      },
      {
        value: "America/Phoenix",
        label: "America - Phoenix",
      },
      {
        value: "Pacific/Honolulu",
        label: "Pacific - Honolulu",
      },
    ],
  },

  {
    label: "All Other International Timezones",
    options: [
      {
        value: "Africa/Abidjan",
        label: "Africa - Abidjan",
      },
      {
        value: "Africa/Accra",
        label: "Africa - Accra",
      },
      {
        value: "Africa/Addis_Ababa",
        label: "Africa - Addis Ababa",
      },
      {
        value: "Africa/Algiers",
        label: "Africa - Algiers",
      },
      {
        value: "Africa/Asmara",
        label: "Africa - Asmara",
      },
      {
        value: "Africa/Asmera",
        label: "Africa - Asmera",
      },
      {
        value: "Africa/Bamako",
        label: "Africa - Bamako",
      },
      {
        value: "Africa/Bangui",
        label: "Africa - Bangui",
      },
      {
        value: "Africa/Banjul",
        label: "Africa - Banjul",
      },
      {
        value: "Africa/Bissau",
        label: "Africa - Bissau",
      },
      {
        value: "Africa/Blantyre",
        label: "Africa - Blantyre",
      },
      {
        value: "Africa/Brazzaville",
        label: "Africa - Brazzaville",
      },
      {
        value: "Africa/Bujumbura",
        label: "Africa - Bujumbura",
      },
      {
        value: "Africa/Cairo",
        label: "Africa - Cairo",
      },
      {
        value: "Africa/Casablanca",
        label: "Africa - Casablanca",
      },
      {
        value: "Africa/Ceuta",
        label: "Africa - Ceuta",
      },
      {
        value: "Africa/Conakry",
        label: "Africa - Conakry",
      },
      {
        value: "Africa/Dakar",
        label: "Africa - Dakar",
      },
      {
        value: "Africa/Dar_es_Salaam",
        label: "Africa - Dar es Salaam",
      },
      {
        value: "Africa/Djibouti",
        label: "Africa - Djibouti",
      },
      {
        value: "Africa/Douala",
        label: "Africa - Douala",
      },
      {
        value: "Africa/El_Aaiun",
        label: "Africa - El Aaiun",
      },
      {
        value: "Africa/Freetown",
        label: "Africa - Freetown",
      },
      {
        value: "Africa/Gaborone",
        label: "Africa - Gaborone",
      },
      {
        value: "Africa/Harare",
        label: "Africa - Harare",
      },
      {
        value: "Africa/Johannesburg",
        label: "Africa - Johannesburg",
      },
      {
        value: "Africa/Juba",
        label: "Africa - Juba",
      },
      {
        value: "Africa/Kampala",
        label: "Africa - Kampala",
      },
      {
        value: "Africa/Khartoum",
        label: "Africa - Khartoum",
      },
      {
        value: "Africa/Kigali",
        label: "Africa - Kigali",
      },
      {
        value: "Africa/Kinshasa",
        label: "Africa - Kinshasa",
      },
      {
        value: "Africa/Lagos",
        label: "Africa - Lagos",
      },
      {
        value: "Africa/Libreville",
        label: "Africa - Libreville",
      },
      {
        value: "Africa/Lome",
        label: "Africa - Lome",
      },
      {
        value: "Africa/Luanda",
        label: "Africa - Luanda",
      },
      {
        value: "Africa/Lubumbashi",
        label: "Africa - Lubumbashi",
      },
      {
        value: "Africa/Lusaka",
        label: "Africa - Lusaka",
      },
      {
        value: "Africa/Malabo",
        label: "Africa - Malabo",
      },
      {
        value: "Africa/Maputo",
        label: "Africa - Maputo",
      },
      {
        value: "Africa/Maseru",
        label: "Africa - Maseru",
      },
      {
        value: "Africa/Mbabane",
        label: "Africa - Mbabane",
      },
      {
        value: "Africa/Mogadishu",
        label: "Africa - Mogadishu",
      },
      {
        value: "Africa/Monrovia",
        label: "Africa - Monrovia",
      },
      {
        value: "Africa/Nairobi",
        label: "Africa - Nairobi",
      },
      {
        value: "Africa/Ndjamena",
        label: "Africa - Ndjamena",
      },
      {
        value: "Africa/Niamey",
        label: "Africa - Niamey",
      },
      {
        value: "Africa/Nouakchott",
        label: "Africa - Nouakchott",
      },
      {
        value: "Africa/Ouagadougou",
        label: "Africa - Ouagadougou",
      },
      {
        value: "Africa/Porto-Novo",
        label: "Africa - Porto-Novo",
      },
      {
        value: "Africa/Sao_Tome",
        label: "Africa - Sao Tome",
      },
      {
        value: "Africa/Timbuktu",
        label: "Africa - Timbuktu",
      },
      {
        value: "Africa/Tripoli",
        label: "Africa - Tripoli",
      },
      {
        value: "Africa/Tunis",
        label: "Africa - Tunis",
      },
      {
        value: "Africa/Windhoek",
        label: "Africa - Windhoek",
      },
      {
        value: "America/Adak",
        label: "America - Adak",
      },
      {
        value: "America/Anchorage",
        label: "America - Anchorage",
      },
      {
        value: "America/Anguilla",
        label: "America - Anguilla",
      },
      {
        value: "America/Antigua",
        label: "America - Antigua",
      },
      {
        value: "America/Araguaina",
        label: "America - Araguaina",
      },
      {
        value: "America/Aruba",
        label: "America - Aruba",
      },
      {
        value: "America/Asuncion",
        label: "America - Asuncion",
      },
      {
        value: "America/Atikokan",
        label: "America - Atikokan",
      },
      {
        value: "America/Atka",
        label: "America - Atka",
      },
      {
        value: "America/Bahia",
        label: "America - Bahia",
      },
      {
        value: "America/Bahia_Banderas",
        label: "America - Bahia Banderas",
      },
      {
        value: "America/Barbados",
        label: "America - Barbados",
      },
      {
        value: "America/Belem",
        label: "America - Belem",
      },
      {
        value: "America/Belize",
        label: "America - Belize",
      },
      {
        value: "America/North_Dakota/Beulah",
        label: "America - Beulah, North Dakota",
      },
      {
        value: "America/Blanc-Sablon",
        label: "America - Blanc-Sablon",
      },
      {
        value: "America/Boa_Vista",
        label: "America - Boa Vista",
      },
      {
        value: "America/Bogota",
        label: "America - Bogota",
      },
      {
        value: "America/Boise",
        label: "America - Boise",
      },
      {
        value: "America/Buenos_Aires",
        label: "America - Buenos Aires",
      },
      {
        value: "America/Argentina/Buenos_Aires",
        label: "America - Buenos Aires, Argentina",
      },
      {
        value: "America/Cambridge_Bay",
        label: "America - Cambridge Bay",
      },
      {
        value: "America/Campo_Grande",
        label: "America - Campo Grande",
      },
      {
        value: "America/Cancun",
        label: "America - Cancun",
      },
      {
        value: "America/Caracas",
        label: "America - Caracas",
      },
      {
        value: "America/Catamarca",
        label: "America - Catamarca",
      },
      {
        value: "America/Argentina/Catamarca",
        label: "America - Catamarca, Argentina",
      },
      {
        value: "America/Cayenne",
        label: "America - Cayenne",
      },
      {
        value: "America/Cayman",
        label: "America - Cayman",
      },
      {
        value: "America/North_Dakota/Center",
        label: "America - Center, North Dakota",
      },
      {
        value: "America/Chihuahua",
        label: "America - Chihuahua",
      },
      {
        value: "America/Argentina/ComodRivadavia",
        label: "America - Comod Rivadavia, Argentina",
      },
      {
        value: "America/Coral_Harbour",
        label: "America - Coral Harbour",
      },
      {
        value: "America/Cordoba",
        label: "America - Cordoba",
      },
      {
        value: "America/Argentina/Cordoba",
        label: "America - Cordoba, Argentina",
      },
      {
        value: "America/Costa_Rica",
        label: "America - Costa Rica",
      },
      {
        value: "America/Creston",
        label: "America - Creston",
      },
      {
        value: "America/Cuiaba",
        label: "America - Cuiaba",
      },
      {
        value: "America/Curacao",
        label: "America - Curacao",
      },
      {
        value: "America/Danmarkshavn",
        label: "America - Danmarkshavn",
      },
      {
        value: "America/Dawson",
        label: "America - Dawson",
      },
      {
        value: "America/Dawson_Creek",
        label: "America - Dawson Creek",
      },
      {
        value: "America/Detroit",
        label: "America - Detroit",
      },
      {
        value: "America/Dominica",
        label: "America - Dominica",
      },
      {
        value: "America/Edmonton",
        label: "America - Edmonton",
      },
      {
        value: "America/Eirunepe",
        label: "America - Eirunepe",
      },
      {
        value: "America/El_Salvador",
        label: "America - El Salvador",
      },
      {
        value: "America/Ensenada",
        label: "America - Ensenada",
      },
      {
        value: "America/Fort_Nelson",
        label: "America - Fort Nelson",
      },
      {
        value: "America/Fort_Wayne",
        label: "America - Fort Wayne",
      },
      {
        value: "America/Fortaleza",
        label: "America - Fortaleza",
      },
      {
        value: "America/Glace_Bay",
        label: "America - Glace Bay",
      },
      {
        value: "America/Godthab",
        label: "America - Godthab",
      },
      {
        value: "America/Goose_Bay",
        label: "America - Goose Bay",
      },
      {
        value: "America/Grand_Turk",
        label: "America - Grand Turk",
      },
      {
        value: "America/Grenada",
        label: "America - Grenada",
      },
      {
        value: "America/Guadeloupe",
        label: "America - Guadeloupe",
      },
      {
        value: "America/Guatemala",
        label: "America - Guatemala",
      },
      {
        value: "America/Guayaquil",
        label: "America - Guayaquil",
      },
      {
        value: "America/Guyana",
        label: "America - Guyana",
      },
      {
        value: "America/Halifax",
        label: "America - Halifax",
      },
      {
        value: "America/Havana",
        label: "America - Havana",
      },
      {
        value: "America/Hermosillo",
        label: "America - Hermosillo",
      },
      {
        value: "America/Indianapolis",
        label: "America - Indianapolis",
      },
      {
        value: "America/Indiana/Indianapolis",
        label: "America - Indianapolis, Indiana",
      },
      {
        value: "America/Inuvik",
        label: "America - Inuvik",
      },
      {
        value: "America/Iqaluit",
        label: "America - Iqaluit",
      },
      {
        value: "America/Jamaica",
        label: "America - Jamaica",
      },
      {
        value: "America/Jujuy",
        label: "America - Jujuy",
      },
      {
        value: "America/Argentina/Jujuy",
        label: "America - Jujuy, Argentina",
      },
      {
        value: "America/Knox_IN",
        label: "America - Knox I'N",
      },
      {
        value: "America/Indiana/Knox",
        label: "America - Knox, Indiana",
      },
      {
        value: "America/Kralendijk",
        label: "America - Kralendijk",
      },
      {
        value: "America/La_Paz",
        label: "America - La Paz",
      },
      {
        value: "America/Argentina/La_Rioja",
        label: "America - La Rioja, Argentina",
      },
      {
        value: "America/Lima",
        label: "America - Lima",
      },
      {
        value: "America/Louisville",
        label: "America - Louisville",
      },
      {
        value: "America/Kentucky/Louisville",
        label: "America - Louisville, Kentucky",
      },
      {
        value: "America/Lower_Princes",
        label: "America - Lower Princes",
      },
      {
        value: "America/Maceio",
        label: "America - Maceio",
      },
      {
        value: "America/Managua",
        label: "America - Managua",
      },
      {
        value: "America/Manaus",
        label: "America - Manaus",
      },
      {
        value: "America/Indiana/Marengo",
        label: "America - Marengo, Indiana",
      },
      {
        value: "America/Marigot",
        label: "America - Marigot",
      },
      {
        value: "America/Martinique",
        label: "America - Martinique",
      },
      {
        value: "America/Matamoros",
        label: "America - Matamoros",
      },
      {
        value: "America/Mazatlan",
        label: "America - Mazatlan",
      },
      {
        value: "America/Mendoza",
        label: "America - Mendoza",
      },
      {
        value: "America/Argentina/Mendoza",
        label: "America - Mendoza, Argentina",
      },
      {
        value: "America/Menominee",
        label: "America - Menominee",
      },
      {
        value: "America/Merida",
        label: "America - Merida",
      },
      {
        value: "America/Metlakatla",
        label: "America - Metlakatla",
      },
      {
        value: "America/Mexico_City",
        label: "America - Mexico City",
      },
      {
        value: "America/Miquelon",
        label: "America - Miquelon",
      },
      {
        value: "America/Moncton",
        label: "America - Moncton",
      },
      {
        value: "America/Monterrey",
        label: "America - Monterrey",
      },
      {
        value: "America/Montevideo",
        label: "America - Montevideo",
      },
      {
        value: "America/Kentucky/Monticello",
        label: "America - Monticello, Kentucky",
      },
      {
        value: "America/Montreal",
        label: "America - Montreal",
      },
      {
        value: "America/Montserrat",
        label: "America - Montserrat",
      },
      {
        value: "America/Nassau",
        label: "America - Nassau",
      },
      {
        value: "America/North_Dakota/New_Salem",
        label: "America - New Salem, North Dakota",
      },
      {
        value: "America/Nipigon",
        label: "America - Nipigon",
      },
      {
        value: "America/Nome",
        label: "America - Nome",
      },
      {
        value: "America/Noronha",
        label: "America - Noronha",
      },
      {
        value: "America/Ojinaga",
        label: "America - Ojinaga",
      },
      {
        value: "America/Panama",
        label: "America - Panama",
      },
      {
        value: "America/Pangnirtung",
        label: "America - Pangnirtung",
      },
      {
        value: "America/Paramaribo",
        label: "America - Paramaribo",
      },
      {
        value: "America/Indiana/Petersburg",
        label: "America - Petersburg, Indiana",
      },
      {
        value: "America/Port_of_Spain",
        label: "America - Port of Spain",
      },
      {
        value: "America/Port-au-Prince",
        label: "America - Port-au-Prince",
      },
      {
        value: "America/Porto_Acre",
        label: "America - Porto Acre",
      },
      {
        value: "America/Porto_Velho",
        label: "America - Porto Velho",
      },
      {
        value: "America/Puerto_Rico",
        label: "America - Puerto Rico",
      },
      {
        value: "America/Punta_Arenas",
        label: "America - Punta Arenas",
      },
      {
        value: "America/Rainy_River",
        label: "America - Rainy River",
      },
      {
        value: "America/Rankin_Inlet",
        label: "America - Rankin Inlet",
      },
      {
        value: "America/Recife",
        label: "America - Recife",
      },
      {
        value: "America/Regina",
        label: "America - Regina",
      },
      {
        value: "America/Resolute",
        label: "America - Resolute",
      },
      {
        value: "America/Rio_Branco",
        label: "America - Rio Branco",
      },
      {
        value: "America/Argentina/Rio_Gallegos",
        label: "America - Rio Gallegos, Argentina",
      },
      {
        value: "America/Rosario",
        label: "America - Rosario",
      },
      {
        value: "America/Argentina/Salta",
        label: "America - Salta, Argentina",
      },
      {
        value: "America/Argentina/San_Juan",
        label: "America - San Juan, Argentina",
      },
      {
        value: "America/Argentina/San_Luis",
        label: "America - San Luis, Argentina",
      },
      {
        value: "America/Santa_Isabel",
        label: "America - Santa Isabel",
      },
      {
        value: "America/Santarem",
        label: "America - Santarem",
      },
      {
        value: "America/Santiago",
        label: "America - Santiago",
      },
      {
        value: "America/Santo_Domingo",
        label: "America - Santo Domingo",
      },
      {
        value: "America/Sao_Paulo",
        label: "America - Sao Paulo",
      },
      {
        value: "America/Scoresbysund",
        label: "America - Scoresbysund",
      },
      {
        value: "America/Shiprock",
        label: "America - Shiprock",
      },
      {
        value: "America/Sitka",
        label: "America - Sitka",
      },
      {
        value: "America/St_Barthelemy",
        label: "America - St Barthelemy",
      },
      {
        value: "America/St_Johns",
        label: "America - St Johns",
      },
      {
        value: "America/St_Kitts",
        label: "America - St Kitts",
      },
      {
        value: "America/St_Lucia",
        label: "America - St Lucia",
      },
      {
        value: "America/St_Thomas",
        label: "America - St Thomas",
      },
      {
        value: "America/St_Vincent",
        label: "America - St Vincent",
      },
      {
        value: "America/Swift_Current",
        label: "America - Swift Current",
      },
      {
        value: "America/Tegucigalpa",
        label: "America - Tegucigalpa",
      },
      {
        value: "America/Indiana/Tell_City",
        label: "America - Tell City, Indiana",
      },
      {
        value: "America/Thule",
        label: "America - Thule",
      },
      {
        value: "America/Thunder_Bay",
        label: "America - Thunder Bay",
      },
      {
        value: "America/Tijuana",
        label: "America - Tijuana",
      },
      {
        value: "America/Toronto",
        label: "America - Toronto",
      },
      {
        value: "America/Tortola",
        label: "America - Tortola",
      },
      {
        value: "America/Argentina/Tucuman",
        label: "America - Tucuman, Argentina",
      },
      {
        value: "America/Argentina/Ushuaia",
        label: "America - Ushuaia, Argentina",
      },
      {
        value: "America/Vancouver",
        label: "America - Vancouver",
      },
      {
        value: "America/Indiana/Vevay",
        label: "America - Vevay, Indiana",
      },
      {
        value: "America/Indiana/Vincennes",
        label: "America - Vincennes, Indiana",
      },
      {
        value: "America/Virgin",
        label: "America - Virgin",
      },
      {
        value: "America/Whitehorse",
        label: "America - Whitehorse",
      },
      {
        value: "America/Indiana/Winamac",
        label: "America - Winamac, Indiana",
      },
      {
        value: "America/Winnipeg",
        label: "America - Winnipeg",
      },
      {
        value: "America/Yakutat",
        label: "America - Yakutat",
      },
      {
        value: "America/Yellowknife",
        label: "America - Yellowknife",
      },
      {
        value: "Antarctica/Casey",
        label: "Antarctica - Casey",
      },
      {
        value: "Antarctica/Davis",
        label: "Antarctica - Davis",
      },
      {
        value: "Antarctica/DumontDUrville",
        label: "Antarctica - Dumont D'Urville",
      },
      {
        value: "Antarctica/Macquarie",
        label: "Antarctica - Macquarie",
      },
      {
        value: "Antarctica/Mawson",
        label: "Antarctica - Mawson",
      },
      {
        value: "Antarctica/McMurdo",
        label: "Antarctica - McMurdo",
      },
      {
        value: "Antarctica/Palmer",
        label: "Antarctica - Palmer",
      },
      {
        value: "Antarctica/Rothera",
        label: "Antarctica - Rothera",
      },
      {
        value: "Antarctica/South_Pole",
        label: "Antarctica - South Pole",
      },
      {
        value: "Antarctica/Syowa",
        label: "Antarctica - Syowa",
      },
      {
        value: "Antarctica/Troll",
        label: "Antarctica - Troll",
      },
      {
        value: "Antarctica/Vostok",
        label: "Antarctica - Vostok",
      },
      {
        value: "Arctic/Longyearbyen",
        label: "Arctic - Longyearbyen",
      },
      {
        value: "Asia/Aden",
        label: "Asia - Aden",
      },
      {
        value: "Asia/Almaty",
        label: "Asia - Almaty",
      },
      {
        value: "Asia/Amman",
        label: "Asia - Amman",
      },
      {
        value: "Asia/Anadyr",
        label: "Asia - Anadyr",
      },
      {
        value: "Asia/Aqtau",
        label: "Asia - Aqtau",
      },
      {
        value: "Asia/Aqtobe",
        label: "Asia - Aqtobe",
      },
      {
        value: "Asia/Ashgabat",
        label: "Asia - Ashgabat",
      },
      {
        value: "Asia/Ashkhabad",
        label: "Asia - Ashkhabad",
      },
      {
        value: "Asia/Atyrau",
        label: "Asia - Atyrau",
      },
      {
        value: "Asia/Baghdad",
        label: "Asia - Baghdad",
      },
      {
        value: "Asia/Bahrain",
        label: "Asia - Bahrain",
      },
      {
        value: "Asia/Baku",
        label: "Asia - Baku",
      },
      {
        value: "Asia/Bangkok",
        label: "Asia - Bangkok",
      },
      {
        value: "Asia/Barnaul",
        label: "Asia - Barnaul",
      },
      {
        value: "Asia/Beirut",
        label: "Asia - Beirut",
      },
      {
        value: "Asia/Bishkek",
        label: "Asia - Bishkek",
      },
      {
        value: "Asia/Brunei",
        label: "Asia - Brunei",
      },
      {
        value: "Asia/Calcutta",
        label: "Asia - Calcutta",
      },
      {
        value: "Asia/Chita",
        label: "Asia - Chita",
      },
      {
        value: "Asia/Choibalsan",
        label: "Asia - Choibalsan",
      },
      {
        value: "Asia/Chongqing",
        label: "Asia - Chongqing",
      },
      {
        value: "Asia/Chungking",
        label: "Asia - Chungking",
      },
      {
        value: "Asia/Colombo",
        label: "Asia - Colombo",
      },
      {
        value: "Asia/Dacca",
        label: "Asia - Dacca",
      },
      {
        value: "Asia/Damascus",
        label: "Asia - Damascus",
      },
      {
        value: "Asia/Dhaka",
        label: "Asia - Dhaka",
      },
      {
        value: "Asia/Dili",
        label: "Asia - Dili",
      },
      {
        value: "Asia/Dubai",
        label: "Asia - Dubai",
      },
      {
        value: "Asia/Dushanbe",
        label: "Asia - Dushanbe",
      },
      {
        value: "Asia/Famagusta",
        label: "Asia - Famagusta",
      },
      {
        value: "Asia/Gaza",
        label: "Asia - Gaza",
      },
      {
        value: "Asia/Harbin",
        label: "Asia - Harbin",
      },
      {
        value: "Asia/Hebron",
        label: "Asia - Hebron",
      },
      {
        value: "Asia/Ho_Chi_Minh",
        label: "Asia - Ho Chi Minh",
      },
      {
        value: "Asia/Hong_Kong",
        label: "Asia - Hong Kong",
      },
      {
        value: "Asia/Hovd",
        label: "Asia - Hovd",
      },
      {
        value: "Asia/Irkutsk",
        label: "Asia - Irkutsk",
      },
      {
        value: "Asia/Istanbul",
        label: "Asia - Istanbul",
      },
      {
        value: "Asia/Jakarta",
        label: "Asia - Jakarta",
      },
      {
        value: "Asia/Jayapura",
        label: "Asia - Jayapura",
      },
      {
        value: "Asia/Jerusalem",
        label: "Asia - Jerusalem",
      },
      {
        value: "Asia/Kabul",
        label: "Asia - Kabul",
      },
      {
        value: "Asia/Kamchatka",
        label: "Asia - Kamchatka",
      },
      {
        value: "Asia/Karachi",
        label: "Asia - Karachi",
      },
      {
        value: "Asia/Kashgar",
        label: "Asia - Kashgar",
      },
      {
        value: "Asia/Kathmandu",
        label: "Asia - Kathmandu",
      },
      {
        value: "Asia/Katmandu",
        label: "Asia - Katmandu",
      },
      {
        value: "Asia/Khandyga",
        label: "Asia - Khandyga",
      },
      {
        value: "Asia/Kolkata",
        label: "Asia - Kolkata",
      },
      {
        value: "Asia/Krasnoyarsk",
        label: "Asia - Krasnoyarsk",
      },
      {
        value: "Asia/Kuala_Lumpur",
        label: "Asia - Kuala Lumpur",
      },
      {
        value: "Asia/Kuching",
        label: "Asia - Kuching",
      },
      {
        value: "Asia/Kuwait",
        label: "Asia - Kuwait",
      },
      {
        value: "Asia/Macao",
        label: "Asia - Macao",
      },
      {
        value: "Asia/Macau",
        label: "Asia - Macau",
      },
      {
        value: "Asia/Magadan",
        label: "Asia - Magadan",
      },
      {
        value: "Asia/Makassar",
        label: "Asia - Makassar",
      },
      {
        value: "Asia/Manila",
        label: "Asia - Manila",
      },
      {
        value: "Asia/Muscat",
        label: "Asia - Muscat",
      },
      {
        value: "Asia/Nicosia",
        label: "Asia - Nicosia",
      },
      {
        value: "Asia/Novokuznetsk",
        label: "Asia - Novokuznetsk",
      },
      {
        value: "Asia/Novosibirsk",
        label: "Asia - Novosibirsk",
      },
      {
        value: "Asia/Omsk",
        label: "Asia - Omsk",
      },
      {
        value: "Asia/Oral",
        label: "Asia - Oral",
      },
      {
        value: "Asia/Phnom_Penh",
        label: "Asia - Phnom Penh",
      },
      {
        value: "Asia/Pontianak",
        label: "Asia - Pontianak",
      },
      {
        value: "Asia/Pyongyang",
        label: "Asia - Pyongyang",
      },
      {
        value: "Asia/Qatar",
        label: "Asia - Qatar",
      },
      {
        value: "Asia/Qostanay",
        label: "Asia - Qostanay",
      },
      {
        value: "Asia/Qyzylorda",
        label: "Asia - Qyzylorda",
      },
      {
        value: "Asia/Rangoon",
        label: "Asia - Rangoon",
      },
      {
        value: "Asia/Riyadh",
        label: "Asia - Riyadh",
      },
      {
        value: "Asia/Saigon",
        label: "Asia - Saigon",
      },
      {
        value: "Asia/Sakhalin",
        label: "Asia - Sakhalin",
      },
      {
        value: "Asia/Samarkand",
        label: "Asia - Samarkand",
      },
      {
        value: "Asia/Seoul",
        label: "Asia - Seoul",
      },
      {
        value: "Asia/Shanghai",
        label: "Asia - Shanghai",
      },
      {
        value: "Asia/Singapore",
        label: "Asia - Singapore",
      },
      {
        value: "Asia/Srednekolymsk",
        label: "Asia - Srednekolymsk",
      },
      {
        value: "Asia/Taipei",
        label: "Asia - Taipei",
      },
      {
        value: "Asia/Tashkent",
        label: "Asia - Tashkent",
      },
      {
        value: "Asia/Tbilisi",
        label: "Asia - Tbilisi",
      },
      {
        value: "Asia/Tehran",
        label: "Asia - Tehran",
      },
      {
        value: "Asia/Tel_Aviv",
        label: "Asia - Tel Aviv",
      },
      {
        value: "Asia/Thimbu",
        label: "Asia - Thimbu",
      },
      {
        value: "Asia/Thimphu",
        label: "Asia - Thimphu",
      },
      {
        value: "Asia/Tokyo",
        label: "Asia - Tokyo",
      },
      {
        value: "Asia/Tomsk",
        label: "Asia - Tomsk",
      },
      {
        value: "Asia/Ujung_Pandang",
        label: "Asia - Ujung Pandang",
      },
      {
        value: "Asia/Ulaanbaatar",
        label: "Asia - Ulaanbaatar",
      },
      {
        value: "Asia/Ulan_Bator",
        label: "Asia - Ulan Bator",
      },
      {
        value: "Asia/Urumqi",
        label: "Asia - Urumqi",
      },
      {
        value: "Asia/Ust-Nera",
        label: "Asia - Ust-Nera",
      },
      {
        value: "Asia/Vientiane",
        label: "Asia - Vientiane",
      },
      {
        value: "Asia/Vladivostok",
        label: "Asia - Vladivostok",
      },
      {
        value: "Asia/Yakutsk",
        label: "Asia - Yakutsk",
      },
      {
        value: "Asia/Yangon",
        label: "Asia - Yangon",
      },
      {
        value: "Asia/Yekaterinburg",
        label: "Asia - Yekaterinburg",
      },
      {
        value: "Asia/Yerevan",
        label: "Asia - Yerevan",
      },
      {
        value: "Atlantic/Azores",
        label: "Atlantic - Azores",
      },
      {
        value: "Atlantic/Bermuda",
        label: "Atlantic - Bermuda",
      },
      {
        value: "Atlantic/Canary",
        label: "Atlantic - Canary",
      },
      {
        value: "Atlantic/Cape_Verde",
        label: "Atlantic - Cape Verde",
      },
      {
        value: "Atlantic/Faeroe",
        label: "Atlantic - Faeroe",
      },
      {
        value: "Atlantic/Faroe",
        label: "Atlantic - Faroe",
      },
      {
        value: "Atlantic/Jan_Mayen",
        label: "Atlantic - Jan Mayen",
      },
      {
        value: "Atlantic/Madeira",
        label: "Atlantic - Madeira",
      },
      {
        value: "Atlantic/Reykjavik",
        label: "Atlantic - Reykjavik",
      },
      {
        value: "Atlantic/South_Georgia",
        label: "Atlantic - South Georgia",
      },
      {
        value: "Atlantic/St_Helena",
        label: "Atlantic - St Helena",
      },
      {
        value: "Atlantic/Stanley",
        label: "Atlantic - Stanley",
      },
      {
        value: "Australia/ACT",
        label: "Australia - ACT",
      },
      {
        value: "Australia/Adelaide",
        label: "Australia - Adelaide",
      },
      {
        value: "Australia/Brisbane",
        label: "Australia - Brisbane",
      },
      {
        value: "Australia/Broken_Hill",
        label: "Australia - Broken Hill",
      },
      {
        value: "Australia/Canberra",
        label: "Australia - Canberra",
      },
      {
        value: "Australia/Currie",
        label: "Australia - Currie",
      },
      {
        value: "Australia/Darwin",
        label: "Australia - Darwin",
      },
      {
        value: "Australia/Eucla",
        label: "Australia - Eucla",
      },
      {
        value: "Australia/Hobart",
        label: "Australia - Hobart",
      },
      {
        value: "Australia/LHI",
        label: "Australia - LHI",
      },
      {
        value: "Australia/Lindeman",
        label: "Australia - Lindeman",
      },
      {
        value: "Australia/Lord_Howe",
        label: "Australia - Lord Howe",
      },
      {
        value: "Australia/Melbourne",
        label: "Australia - Melbourne",
      },
      {
        value: "Australia/NSW",
        label: "Australia - NSW",
      },
      {
        value: "Australia/North",
        label: "Australia - North",
      },
      {
        value: "Australia/Perth",
        label: "Australia - Perth",
      },
      {
        value: "Australia/Queensland",
        label: "Australia - Queensland",
      },
      {
        value: "Australia/South",
        label: "Australia - South",
      },
      {
        value: "Australia/Sydney",
        label: "Australia - Sydney",
      },
      {
        value: "Australia/Tasmania",
        label: "Australia - Tasmania",
      },
      {
        value: "Australia/Victoria",
        label: "Australia - Victoria",
      },
      {
        value: "Australia/West",
        label: "Australia - West",
      },
      {
        value: "Australia/Yancowinna",
        label: "Australia - Yancowinna",
      },
      {
        value: "Brazil/Acre",
        label: "Brazil - Acre",
      },
      {
        value: "Brazil/DeNoronha",
        label: "Brazil - De Noronha",
      },
      {
        value: "Brazil/East",
        label: "Brazil - East",
      },
      {
        value: "Brazil/West",
        label: "Brazil - West",
      },
      {
        value: "CET",
        label: "CET",
      },
      {
        value: "CST6CDT",
        label: "CST6CDT",
      },
      {
        value: "Canada/Atlantic",
        label: "Canada - Atlantic",
      },
      {
        value: "Canada/Central",
        label: "Canada - Central",
      },
      {
        value: "Canada/Eastern",
        label: "Canada - Eastern",
      },
      {
        value: "Canada/Mountain",
        label: "Canada - Mountain",
      },
      {
        value: "Canada/Newfoundland",
        label: "Canada - Newfoundland",
      },
      {
        value: "Canada/Pacific",
        label: "Canada - Pacific",
      },
      {
        value: "Canada/Saskatchewan",
        label: "Canada - Saskatchewan",
      },
      {
        value: "Canada/Yukon",
        label: "Canada - Yukon",
      },
      {
        value: "Chile/Continental",
        label: "Chile - Continental",
      },
      {
        value: "Chile/EasterIsland",
        label: "Chile - Easter Island",
      },
      {
        value: "Cuba",
        label: "Cuba",
      },
      {
        value: "EET",
        label: "EET",
      },
      {
        value: "EST",
        label: "EST",
      },
      {
        value: "EST5EDT",
        label: "EST5EDT",
      },
      {
        value: "Egypt",
        label: "Egypt",
      },
      {
        value: "Eire",
        label: "Eire",
      },
      {
        value: "Etc/GMT",
        label: "Etc - GMT",
      },
      {
        value: "Etc/GMT+0",
        label: "Etc - GMT+0",
      },
      {
        value: "Etc/GMT+1",
        label: "Etc - GMT+1",
      },
      {
        value: "Etc/GMT+10",
        label: "Etc - GMT+10",
      },
      {
        value: "Etc/GMT+11",
        label: "Etc - GMT+11",
      },
      {
        value: "Etc/GMT+12",
        label: "Etc - GMT+12",
      },
      {
        value: "Etc/GMT+2",
        label: "Etc - GMT+2",
      },
      {
        value: "Etc/GMT+3",
        label: "Etc - GMT+3",
      },
      {
        value: "Etc/GMT+4",
        label: "Etc - GMT+4",
      },
      {
        value: "Etc/GMT+5",
        label: "Etc - GMT+5",
      },
      {
        value: "Etc/GMT+6",
        label: "Etc - GMT+6",
      },
      {
        value: "Etc/GMT+7",
        label: "Etc - GMT+7",
      },
      {
        value: "Etc/GMT+8",
        label: "Etc - GMT+8",
      },
      {
        value: "Etc/GMT+9",
        label: "Etc - GMT+9",
      },
      {
        value: "Etc/GMT-0",
        label: "Etc - GMT-0",
      },
      {
        value: "Etc/GMT-1",
        label: "Etc - GMT-1",
      },
      {
        value: "Etc/GMT-10",
        label: "Etc - GMT-10",
      },
      {
        value: "Etc/GMT-11",
        label: "Etc - GMT-11",
      },
      {
        value: "Etc/GMT-12",
        label: "Etc - GMT-12",
      },
      {
        value: "Etc/GMT-13",
        label: "Etc - GMT-13",
      },
      {
        value: "Etc/GMT-14",
        label: "Etc - GMT-14",
      },
      {
        value: "Etc/GMT-2",
        label: "Etc - GMT-2",
      },
      {
        value: "Etc/GMT-3",
        label: "Etc - GMT-3",
      },
      {
        value: "Etc/GMT-4",
        label: "Etc - GMT-4",
      },
      {
        value: "Etc/GMT-5",
        label: "Etc - GMT-5",
      },
      {
        value: "Etc/GMT-6",
        label: "Etc - GMT-6",
      },
      {
        value: "Etc/GMT-7",
        label: "Etc - GMT-7",
      },
      {
        value: "Etc/GMT-8",
        label: "Etc - GMT-8",
      },
      {
        value: "Etc/GMT-9",
        label: "Etc - GMT-9",
      },
      {
        value: "Etc/GMT0",
        label: "Etc - GMT0",
      },
      {
        value: "Etc/Greenwich",
        label: "Etc - Greenwich",
      },
      {
        value: "Etc/UCT",
        label: "Etc - UCT",
      },
      {
        value: "Etc/UTC",
        label: "Etc - UTC",
      },
      {
        value: "Etc/Universal",
        label: "Etc - Universal",
      },
      {
        value: "Etc/Zulu",
        label: "Etc - Zulu",
      },
      {
        value: "Europe/Amsterdam",
        label: "Europe - Amsterdam",
      },
      {
        value: "Europe/Andorra",
        label: "Europe - Andorra",
      },
      {
        value: "Europe/Astrakhan",
        label: "Europe - Astrakhan",
      },
      {
        value: "Europe/Athens",
        label: "Europe - Athens",
      },
      {
        value: "Europe/Belfast",
        label: "Europe - Belfast",
      },
      {
        value: "Europe/Belgrade",
        label: "Europe - Belgrade",
      },
      {
        value: "Europe/Berlin",
        label: "Europe - Berlin",
      },
      {
        value: "Europe/Bratislava",
        label: "Europe - Bratislava",
      },
      {
        value: "Europe/Brussels",
        label: "Europe - Brussels",
      },
      {
        value: "Europe/Bucharest",
        label: "Europe - Bucharest",
      },
      {
        value: "Europe/Budapest",
        label: "Europe - Budapest",
      },
      {
        value: "Europe/Busingen",
        label: "Europe - Busingen",
      },
      {
        value: "Europe/Chisinau",
        label: "Europe - Chisinau",
      },
      {
        value: "Europe/Copenhagen",
        label: "Europe - Copenhagen",
      },
      {
        value: "Europe/Dublin",
        label: "Europe - Dublin",
      },
      {
        value: "Europe/Gibraltar",
        label: "Europe - Gibraltar",
      },
      {
        value: "Europe/Guernsey",
        label: "Europe - Guernsey",
      },
      {
        value: "Europe/Helsinki",
        label: "Europe - Helsinki",
      },
      {
        value: "Europe/Isle_of_Man",
        label: "Europe - Isle of Man",
      },
      {
        value: "Europe/Istanbul",
        label: "Europe - Istanbul",
      },
      {
        value: "Europe/Jersey",
        label: "Europe - Jersey",
      },
      {
        value: "Europe/Kaliningrad",
        label: "Europe - Kaliningrad",
      },
      {
        value: "Europe/Kiev",
        label: "Europe - Kiev",
      },
      {
        value: "Europe/Kirov",
        label: "Europe - Kirov",
      },
      {
        value: "Europe/Lisbon",
        label: "Europe - Lisbon",
      },
      {
        value: "Europe/Ljubljana",
        label: "Europe - Ljubljana",
      },
      {
        value: "Europe/London",
        label: "Europe - London",
      },
      {
        value: "Europe/Luxembourg",
        label: "Europe - Luxembourg",
      },
      {
        value: "Europe/Madrid",
        label: "Europe - Madrid",
      },
      {
        value: "Europe/Malta",
        label: "Europe - Malta",
      },
      {
        value: "Europe/Mariehamn",
        label: "Europe - Mariehamn",
      },
      {
        value: "Europe/Minsk",
        label: "Europe - Minsk",
      },
      {
        value: "Europe/Monaco",
        label: "Europe - Monaco",
      },
      {
        value: "Europe/Moscow",
        label: "Europe - Moscow",
      },
      {
        value: "Europe/Nicosia",
        label: "Europe - Nicosia",
      },
      {
        value: "Europe/Oslo",
        label: "Europe - Oslo",
      },
      {
        value: "Europe/Paris",
        label: "Europe - Paris",
      },
      {
        value: "Europe/Podgorica",
        label: "Europe - Podgorica",
      },
      {
        value: "Europe/Prague",
        label: "Europe - Prague",
      },
      {
        value: "Europe/Riga",
        label: "Europe - Riga",
      },
      {
        value: "Europe/Rome",
        label: "Europe - Rome",
      },
      {
        value: "Europe/Samara",
        label: "Europe - Samara",
      },
      {
        value: "Europe/San_Marino",
        label: "Europe - San Marino",
      },
      {
        value: "Europe/Sarajevo",
        label: "Europe - Sarajevo",
      },
      {
        value: "Europe/Saratov",
        label: "Europe - Saratov",
      },
      {
        value: "Europe/Simferopol",
        label: "Europe - Simferopol",
      },
      {
        value: "Europe/Skopje",
        label: "Europe - Skopje",
      },
      {
        value: "Europe/Sofia",
        label: "Europe - Sofia",
      },
      {
        value: "Europe/Stockholm",
        label: "Europe - Stockholm",
      },
      {
        value: "Europe/Tallinn",
        label: "Europe - Tallinn",
      },
      {
        value: "Europe/Tirane",
        label: "Europe - Tirane",
      },
      {
        value: "Europe/Tiraspol",
        label: "Europe - Tiraspol",
      },
      {
        value: "Europe/Ulyanovsk",
        label: "Europe - Ulyanovsk",
      },
      {
        value: "Europe/Uzhgorod",
        label: "Europe - Uzhgorod",
      },
      {
        value: "Europe/Vaduz",
        label: "Europe - Vaduz",
      },
      {
        value: "Europe/Vatican",
        label: "Europe - Vatican",
      },
      {
        value: "Europe/Vienna",
        label: "Europe - Vienna",
      },
      {
        value: "Europe/Vilnius",
        label: "Europe - Vilnius",
      },
      {
        value: "Europe/Volgograd",
        label: "Europe - Volgograd",
      },
      {
        value: "Europe/Warsaw",
        label: "Europe - Warsaw",
      },
      {
        value: "Europe/Zagreb",
        label: "Europe - Zagreb",
      },
      {
        value: "Europe/Zaporozhye",
        label: "Europe - Zaporozhye",
      },
      {
        value: "Europe/Zurich",
        label: "Europe - Zurich",
      },
      { value: "GB", label: "GB" },
      {
        value: "GB-Eire",
        label: "GB-Eire",
      },
      {
        value: "GMT",
        label: "GMT",
      },
      {
        value: "GMT+0",
        label: "GMT+0",
      },
      {
        value: "GMT-0",
        label: "GMT-0",
      },
      {
        value: "GMT0",
        label: "GMT0",
      },
      {
        value: "Greenwich",
        label: "Greenwich",
      },
      {
        value: "HST",
        label: "HST",
      },
      {
        value: "Hongkong",
        label: "Hongkong",
      },
      {
        value: "Iceland",
        label: "Iceland",
      },
      {
        value: "Indian/Antananarivo",
        label: "Indian - Antananarivo",
      },
      {
        value: "Indian/Chagos",
        label: "Indian - Chagos",
      },
      {
        value: "Indian/Christmas",
        label: "Indian - Christmas",
      },
      {
        value: "Indian/Cocos",
        label: "Indian - Cocos",
      },
      {
        value: "Indian/Comoro",
        label: "Indian - Comoro",
      },
      {
        value: "Indian/Kerguelen",
        label: "Indian - Kerguelen",
      },
      {
        value: "Indian/Mahe",
        label: "Indian - Mahe",
      },
      {
        value: "Indian/Maldives",
        label: "Indian - Maldives",
      },
      {
        value: "Indian/Mauritius",
        label: "Indian - Mauritius",
      },
      {
        value: "Indian/Mayotte",
        label: "Indian - Mayotte",
      },
      {
        value: "Indian/Reunion",
        label: "Indian - Reunion",
      },
      {
        value: "Iran",
        label: "Iran",
      },
      {
        value: "Israel",
        label: "Israel",
      },
      {
        value: "Jamaica",
        label: "Jamaica",
      },
      {
        value: "Japan",
        label: "Japan",
      },
      {
        value: "Kwajalein",
        label: "Kwajalein",
      },
      {
        value: "Libya",
        label: "Libya",
      },
      {
        value: "MET",
        label: "MET",
      },
      {
        value: "MST",
        label: "MST",
      },
      {
        value: "MST7MDT",
        label: "MST7MDT",
      },
      {
        value: "Mexico/BajaNorte",
        label: "Mexico - Baja Norte",
      },
      {
        value: "Mexico/BajaSur",
        label: "Mexico - Baja Sur",
      },
      {
        value: "Mexico/General",
        label: "Mexico - General",
      },
      { value: "NZ", label: "NZ" },
      {
        value: "NZ-CHAT",
        label: "NZ-CHAT",
      },
      {
        value: "Navajo",
        label: "Navajo",
      },
      {
        value: "PRC",
        label: "PRC",
      },
      {
        value: "PST8PDT",
        label: "PST8PDT",
      },
      {
        value: "Pacific/Apia",
        label: "Pacific - Apia",
      },
      {
        value: "Pacific/Auckland",
        label: "Pacific - Auckland",
      },
      {
        value: "Pacific/Bougainville",
        label: "Pacific - Bougainville",
      },
      {
        value: "Pacific/Chatham",
        label: "Pacific - Chatham",
      },
      {
        value: "Pacific/Chuuk",
        label: "Pacific - Chuuk",
      },
      {
        value: "Pacific/Easter",
        label: "Pacific - Easter",
      },
      {
        value: "Pacific/Efate",
        label: "Pacific - Efate",
      },
      {
        value: "Pacific/Enderbury",
        label: "Pacific - Enderbury",
      },
      {
        value: "Pacific/Fakaofo",
        label: "Pacific - Fakaofo",
      },
      {
        value: "Pacific/Fiji",
        label: "Pacific - Fiji",
      },
      {
        value: "Pacific/Funafuti",
        label: "Pacific - Funafuti",
      },
      {
        value: "Pacific/Galapagos",
        label: "Pacific - Galapagos",
      },
      {
        value: "Pacific/Gambier",
        label: "Pacific - Gambier",
      },
      {
        value: "Pacific/Guadalcanal",
        label: "Pacific - Guadalcanal",
      },
      {
        value: "Pacific/Guam",
        label: "Pacific - Guam",
      },
      {
        value: "Pacific/Johnston",
        label: "Pacific - Johnston",
      },
      {
        value: "Pacific/Kiritimati",
        label: "Pacific - Kiritimati",
      },
      {
        value: "Pacific/Kosrae",
        label: "Pacific - Kosrae",
      },
      {
        value: "Pacific/Kwajalein",
        label: "Pacific - Kwajalein",
      },
      {
        value: "Pacific/Majuro",
        label: "Pacific - Majuro",
      },
      {
        value: "Pacific/Marquesas",
        label: "Pacific - Marquesas",
      },
      {
        value: "Pacific/Midway",
        label: "Pacific - Midway",
      },
      {
        value: "Pacific/Nauru",
        label: "Pacific - Nauru",
      },
      {
        value: "Pacific/Niue",
        label: "Pacific - Niue",
      },
      {
        value: "Pacific/Norfolk",
        label: "Pacific - Norfolk",
      },
      {
        value: "Pacific/Noumea",
        label: "Pacific - Noumea",
      },
      {
        value: "Pacific/Pago_Pago",
        label: "Pacific - Pago Pago",
      },
      {
        value: "Pacific/Palau",
        label: "Pacific - Palau",
      },
      {
        value: "Pacific/Pitcairn",
        label: "Pacific - Pitcairn",
      },
      {
        value: "Pacific/Pohnpei",
        label: "Pacific - Pohnpei",
      },
      {
        value: "Pacific/Ponape",
        label: "Pacific - Ponape",
      },
      {
        value: "Pacific/Port_Moresby",
        label: "Pacific - Port Moresby",
      },
      {
        value: "Pacific/Rarotonga",
        label: "Pacific - Rarotonga",
      },
      {
        value: "Pacific/Saipan",
        label: "Pacific - Saipan",
      },
      {
        value: "Pacific/Samoa",
        label: "Pacific - Samoa",
      },
      {
        value: "Pacific/Tahiti",
        label: "Pacific - Tahiti",
      },
      {
        value: "Pacific/Tarawa",
        label: "Pacific - Tarawa",
      },
      {
        value: "Pacific/Tongatapu",
        label: "Pacific - Tongatapu",
      },
      {
        value: "Pacific/Truk",
        label: "Pacific - Truk",
      },
      {
        value: "Pacific/Wake",
        label: "Pacific - Wake",
      },
      {
        value: "Pacific/Wallis",
        label: "Pacific - Wallis",
      },
      {
        value: "Pacific/Yap",
        label: "Pacific - Yap",
      },
      {
        value: "Poland",
        label: "Poland",
      },
      {
        value: "Portugal",
        label: "Portugal",
      },
      {
        value: "ROC",
        label: "ROC",
      },
      {
        value: "ROK",
        label: "ROK",
      },
      {
        value: "Singapore",
        label: "Singapore",
      },
      {
        value: "SystemV/AST4",
        label: "SystemV - AST4",
      },
      {
        value: "SystemV/AST4ADT",
        label: "SystemV - AST4ADT",
      },
      {
        value: "SystemV/CST6",
        label: "SystemV - CST6",
      },
      {
        value: "SystemV/CST6CDT",
        label: "SystemV - CST6CDT",
      },
      {
        value: "SystemV/EST5",
        label: "SystemV - EST5",
      },
      {
        value: "SystemV/EST5EDT",
        label: "SystemV - EST5EDT",
      },
      {
        value: "SystemV/HST10",
        label: "SystemV - HST10",
      },
      {
        value: "SystemV/MST7",
        label: "SystemV - MST7",
      },
      {
        value: "SystemV/MST7MDT",
        label: "SystemV - MST7MDT",
      },
      {
        value: "SystemV/PST8",
        label: "SystemV - PST8",
      },
      {
        value: "SystemV/PST8PDT",
        label: "SystemV - PST8PDT",
      },
      {
        value: "SystemV/YST9",
        label: "SystemV - YST9",
      },
      {
        value: "SystemV/YST9YDT",
        label: "SystemV - YST9YDT",
      },
      {
        value: "Turkey",
        label: "Turkey",
      },
      {
        value: "UCT",
        label: "UCT",
      },
      {
        value: "US/Alaska",
        label: "US - Alaska",
      },
      {
        value: "US/Aleutian",
        label: "US - Aleutian",
      },
      {
        value: "US/Arizona",
        label: "US - Arizona",
      },
      {
        value: "US/Central",
        label: "US - Central",
      },
      {
        value: "US/East-Indiana",
        label: "US - East-Indiana",
      },
      {
        value: "US/Eastern",
        label: "US - Eastern",
      },
      {
        value: "US/Hawaii",
        label: "US - Hawaii",
      },
      {
        value: "US/Indiana-Starke",
        label: "US - Indiana-Starke",
      },
      {
        value: "US/Michigan",
        label: "US - Michigan",
      },
      {
        value: "US/Mountain",
        label: "US - Mountain",
      },
      {
        value: "US/Pacific",
        label: "US - Pacific",
      },
      {
        value: "US/Pacific-New",
        label: "US - Pacific-New",
      },
      {
        value: "US/Samoa",
        label: "US - Samoa",
      },
      {
        value: "Universal",
        label: "Universal",
      },
      {
        value: "W-SU",
        label: "W-SU",
      },
      {
        value: "WET",
        label: "WET",
      },
      {
        value: "Zulu",
        label: "Zulu",
      },
    ],
  },
];
