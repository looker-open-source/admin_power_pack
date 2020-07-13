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

import { SchedulesTable } from "./SchedulesTable";
import { PopulateParams, PopulateRows } from "./PopulateRows";
import {
  Box,
  Button,
  ComboboxOptionObject,
  Confirm,
  Flex,
  FlexItem,
  Heading,
  InputText,
  Label,
  MessageBar,
  Text,
} from "@looker/components";
import { ExtensionContext } from "@looker/extension-sdk-react";
import { isEqual, cloneDeep } from "lodash";
import {
  IDashboard,
  IScheduledPlan,
  IScheduledPlanDestination,
  IUserPublic,
} from "@looker/sdk";
import React from "react";
import { RouteComponentProps, withRouter } from "react-router-dom";
import { hot } from "react-hot-loader/root";
import { IWriteScheduledPlan } from "@looker/sdk/dist/sdk/4.0/models";

export const READ_ONLY_FIELDS = ["id", "enabled", "owner"];
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

export const SELECT_FIELDS = [
  "datagroup",
  "format",
  "pdf_paper_size",
  "timezone",
];

export const TEXTAREA_FIELDS = ["message", "recipients"];

export const CHECKBOX_FIELDS = [
  "apply_formatting",
  "apply_vis",
  "enabled", // read only
  "include_links",
  "long_tables",
  "pdf_landscape",
  "run_as_recipient",
];

interface ExtensionState {
  currentDash?: IDashboard;
  selectedDashId?: number;
  datagroups: ComboboxOptionObject[]; // array of datagroup string names
  schedulesArray: any; // IScheduledPlanTable[] - array of schedules (can be edited)
  schedulesArrayBackup: any; // IScheduledPlanTable[] - array of schedules stored for reverting edits
  runningQuery: boolean; // false shows 'getting data', true displays table
  runningUpdate: boolean; // false shows 'getting data', true displays table
  hiddenColumns: string[]; // state of column headers to control visibility
  checkboxStatus: any;
  errorMessage?: string;
  notificationMessage?: string;
  populateParams: PopulateParams;
}

// need this to supply null values (--strictNullChecks)
interface IWriteScheduledPlanNulls extends IWriteScheduledPlan {
  crontab?: any;
  datagroup?: any;
  run_as_recipient?: any;
  include_links?: any;
  long_tables?: any;
  pdf_paper_size?: any;
}

// used to display specific fields for all schedules on a Dashboard
export interface IScheduledPlanTable extends IScheduledPlan {
  owner?: string;
  owner_id?: number;
  recipients: string; // converting Array<string> to string
  run_as_recipient?: any;
  include_links?: any;
  [key: string]: any; // needed to dynamically display filters
  scheduled_plan_destination: IScheduledPlanDestination[]; // overriding to make this required
  user: IUserPublic; // overriding to make this required
}

export class SchedulesPage extends React.Component<
  RouteComponentProps,
  ExtensionState
> {
  static contextType = ExtensionContext;
  context!: React.ContextType<typeof ExtensionContext>;

  constructor(props: RouteComponentProps) {
    super(props);
    this.state = {
      currentDash: undefined,
      selectedDashId: undefined,
      datagroups: [],
      schedulesArray: [],
      schedulesArrayBackup: [],
      runningQuery: false,
      runningUpdate: false,
      hiddenColumns: [],
      checkboxStatus: undefined,
      populateParams: {
        queryId: "",
        ownerId: "",
        scheduleName: "",
        cron: "",
      },
    };
    this.handleDashChange = this.handleDashChange.bind(this);
    this.handleDashSubmit = this.handleDashSubmit.bind(this);
    this.handlePopQueryId = this.handlePopQueryId.bind(this);
    this.handlePopOwnerId = this.handlePopOwnerId.bind(this);
    this.handlePopName = this.handlePopName.bind(this);
    this.handlePopCron = this.handlePopCron.bind(this);
  }

  //////////////// POPULATE ROWS ////////////////

  handlePopQueryId = (event: any) => {
    const lastState = this.state.populateParams;
    lastState.queryId = event.target.value;
    this.setState({ populateParams: lastState });
  };

  handlePopOwnerId = (event: any) => {
    const lastState = this.state.populateParams;
    lastState.ownerId = event.target.value;
    this.setState({ populateParams: lastState });
  };

  handlePopName = (event: any) => {
    const lastState = this.state.populateParams;
    lastState.scheduleName = event.target.value;
    this.setState({ populateParams: lastState });
  };

  handlePopCron = (event: any) => {
    const lastState = this.state.populateParams;
    lastState.cron = event.target.value;
    this.setState({ populateParams: lastState });
  };

  resetPopParams = () => {
    this.setState({
      populateParams: {
        queryId: "",
        ownerId: "",
        scheduleName: "",
        cron: "",
      },
    });
    return;
  };

  // ensure all queryId is filled out
  validPopParams = (): boolean => {
    return this.state.populateParams.queryId !== "";
  };

  // populate rows from Looker Query ID
  handlePopSubmit = async () => {
    this.setState({
      runningUpdate: true,
    });

    const params = this.state.populateParams;

    if (this.state.currentDash === undefined || params.queryId === "") {
      this.setState({
        runningUpdate: false,
      });
      return;
    }

    try {
      console.log(params);

      const results: any = await this.context.core40SDK.ok(
        this.context.core40SDK.run_query({
          result_format: "json_detail",
          query_id: Number(params.queryId),
        })
      );

      // [{label_name : view_name.field_name}, ... ]
      const fieldMapper: any = {};
      results.fields.dimensions.forEach((d: any) => {
        fieldMapper[d.label_short] = d.name;
      });
      results.fields.measures.forEach((m: any) => {
        fieldMapper[m.label_short] = m.name;
      });
      console.table(fieldMapper);

      const newArray = cloneDeep(this.state.schedulesArray);

      for (let i = 0; i < results.data.length; i++) {
        const newRow = cloneDeep(newArray[0]);
        Object.keys(newRow).forEach((k) => (newRow[k] = "")); // clear row values first

        Object.keys(newRow).forEach((k: any) => {
          if (!KEY_FIELDS.includes(k) && fieldMapper[k] !== undefined) {
            newRow[k] = results.data[i][fieldMapper[k]].value;
          }
        });

        newRow.owner_id = params.ownerId;
        newRow.name = params.scheduleName;
        newRow.crontab = params.cron;
        newRow.datagroup = " ";

        if (fieldMapper["Email"] !== undefined) {
          newRow.recipients = results.data[i][fieldMapper["Email"]].value;
        }

        newArray.push(newRow);
      }

      this.resetPopParams();

      this.setState({
        schedulesArray: newArray,
        runningUpdate: false,
        errorMessage: undefined,
        notificationMessage: "Rows successfully populated.",
      });
    } catch (error) {
      this.setState({
        runningUpdate: false,
        errorMessage: "Error populating rows.",
        notificationMessage: undefined,
      });
    }

    return;
  };
  ///////////////////////////////////////////////////

  handleDashChange = (event: any) => {
    this.setState({ selectedDashId: event.target.value });
  };

  handleKeyPress = (event: any) => {
    if (event.key === "Enter") {
      this.handleDashSubmit();
    }
  };

  handleDashSubmit = () => {
    if (!this.state.selectedDashId) {
      return;
    }
    console.log(
      "getting schedules for Dashboard: " + this.state.selectedDashId
    );
    this.getDash(this.state.selectedDashId);
  };

  componentDidMount = () => {
    const { initializeError } = this.context;
    if (initializeError) {
      return;
    }
  };

  componentDidUpdate = () => {
    const { initializeError } = this.context;
    if (initializeError) {
      return;
    }
  };

  //////////////// HELPER FUNCTIONS ////////////////

  // link to System Activity Explore
  openExploreWindow = (scheduledPlanID: number): void => {
    const url = `/explore/system__activity/scheduled_plan?fields=scheduled_job.finalized_time,scheduled_job.name,dashboard.title,user.name,scheduled_job.status,scheduled_job.status_detail,scheduled_plan.destination_addresses,scheduled_plan_destination.type,scheduled_plan_destination.format,scheduled_job_stage.runtime&f[scheduled_plan.id]=${scheduledPlanID}&sorts=scheduled_job.finalized_time+desc&limit=500`;
    this.context.extensionSDK.openBrowserWindow(url, "_blank");
  };

  // delete unecessary keys from object
  deleteKeys = (
    obj: IScheduledPlanTable,
    key: string[]
  ): IScheduledPlanTable => {
    key.forEach((k) => delete obj[k]);
    return obj;
  };

  // parse string for commas and create array of destiations
  writeScheduledPlanDestinations = (schedule: IScheduledPlanTable): any => {
    const scheduledPlanDestinations: any = [];
    schedule.recipients.split(",").forEach((email) => {
      scheduledPlanDestinations.push({
        type: "email",
        format: schedule.format,
        address: email,
        apply_formatting: false,
        apply_vis: false,
        ...(schedule.message !== "" && { message: schedule.message }),
        ...(schedule.format === "csv_zip" && {
          apply_formatting: schedule.apply_formatting,
          apply_vis: schedule.apply_vis,
        }),
      });
    });
    return scheduledPlanDestinations;
  };

  // convert from scheduledPlan object to html encoded string_filter
  stringifyFilters = (newSchedule: IScheduledPlanTable): string => {
    let filtersString = "?";
    for (let [key, value] of Object.entries(newSchedule)) {
      if (KEY_FIELDS.includes(key)) {
        continue;
      }

      // don't create empty filters
      if (value === "") {
        continue;
      }

      filtersString = filtersString.concat(
        encodeURIComponent(key),
        "=",
        encodeURIComponent(value),
        "&"
      );
    }
    return filtersString.slice(0, -1);
  };

  // check all required fields are populated. returns true if validated
  validateRow = (row: IScheduledPlanTable): boolean => {
    for (let [key, value] of Object.entries(row)) {
      if (REQUIRED_FIELDS.includes(key) && value === "") {
        return false;
      }
    }

    // 1 trigger field must be filled out, empty datagroups will be: " "
    const triggers = [
      row[REQUIRED_TRIGGER_FIELDS[0]],
      row[REQUIRED_TRIGGER_FIELDS[1]],
    ];
    if (
      triggers.reduce(
        (acc: number, field: string) => acc + (field.length > 1 ? 1 : 0),
        0
      ) !== 1
    ) {
      return false;
    }

    return true;
  };

  // loads empty first row in table. Gets called if Dashboard has no schedules, or,
  // if all rows have been deleted from table
  prepareEmptyTable = async (dash_id: number) => {
    const dash = await this.context.core40SDK.ok(
      this.context.core40SDK.dashboard(dash_id.toString())
    );
    const jsonDash: any = cloneDeep(dash);

    const filtersArray = jsonDash.dashboard_filters.map((f: any) => f.name);
    const headerArray = [...KEY_FIELDS, ...filtersArray];

    const scheduleHeader: any = {};
    headerArray.reduce(
      (acc, item) => (scheduleHeader[item] = ""),
      scheduleHeader
    );

    return [this.setDefaultRowParams(scheduleHeader)];
  };

  assignRowValues = (s: IScheduledPlanTable) => {
    const formattedRow: any = {};

    formattedRow.id = s.id;
    formattedRow.enabled = s.enabled;
    formattedRow.name = s.name;
    formattedRow.timezone = s.timezone;
    formattedRow.include_links = s.include_links;

    formattedRow.owner_id = s.user.id;
    formattedRow.owner = s.user.display_name;
    formattedRow.crontab = s.crontab === null ? "" : s.crontab;
    formattedRow.datagroup =
      s.datagroup === null || s.datagroup === "" ? " " : s.datagroup; // html select tag does not reset to ""
    formattedRow.run_as_recipient =
      s.run_as_recipient === null ? false : s.run_as_recipient;
    formattedRow.long_tables = s.long_tables === null ? false : s.long_tables;
    formattedRow.pdf_landscape =
      s.pdf_landscape === null ? false : s.pdf_landscape;
    formattedRow.pdf_paper_size =
      s.pdf_paper_size === null ? "" : s.pdf_paper_size;
    formattedRow.recipients = s.scheduled_plan_destination
      .map((a: any) => a.address)
      .toString();

    const spd = s.scheduled_plan_destination[0];
    formattedRow.message = spd.message === null ? "" : spd.message;
    formattedRow.format = spd.format;
    formattedRow.apply_vis = spd.apply_vis === null ? false : spd.apply_vis;
    formattedRow.apply_formatting =
      spd.apply_formatting === null ? false : spd.apply_formatting;

    // grab everything after the ? until filter_config
    formattedRow.filters_string = decodeURIComponent(s.filters_string || "")
      .slice(1)
      .split("&filter_config=")[0];
    let filter = formattedRow.filters_string.split("&") || "";

    if (filter[0] !== "") {
      filter.forEach((f: string) => {
        let filterValue: string[] = f.split("=");
        formattedRow[filterValue[0]] = filterValue[1];
      });
    }

    this.deleteKeys(formattedRow, [
      "filters_string",
      "scheduled_plan_destination",
      "user",
    ]);

    return formattedRow;
  };

  // get all scheduled plans for dashboard and prepare for table
  getScheduledPlans = async (dash_id: number) => {
    const schedules = await this.context.core40SDK.ok(
      this.context.core40SDK.scheduled_plans_for_dashboard({
        dashboard_id: dash_id,
        all_users: true,
        fields:
          "enabled,id,name,filters_string,crontab,datagroup,scheduled_plan_destination(type,address,message,format,apply_vis,apply_formatting),run_as_recipient,include_links,timezone,long_tables,pdf_paper_size,pdf_landscape,user(id,display_name)",
      })
    );

    // convert to json to make deep copy
    const schedulesArray: IScheduledPlanTable[] = JSON.parse(
      JSON.stringify(schedules)
    );

    // only keep email based schedules, for now.
    const emailSchedulesArray = schedulesArray.filter(
      (s) => s.scheduled_plan_destination[0].type === "email"
    );

    const scheduleHeader = await this.prepareEmptyTable(dash_id);

    if (emailSchedulesArray.length === 0) {
      console.log("no schedules found. preparing empty table");
      return scheduleHeader;
    } else {
      emailSchedulesArray.forEach((s: IScheduledPlanTable) => {
        const formattedRow = this.assignRowValues(s);

        // add empty filter values for schedules
        for (let [key, value] of Object.entries(scheduleHeader[0])) {
          if (!(key in formattedRow)) {
            formattedRow[key] = value;
          }
        }

        scheduleHeader.push(formattedRow);
      });

      console.table(schedules);
      console.table(scheduleHeader.slice(1));

      return scheduleHeader.slice(1);
    }
  };

  // get all datagroups defined on instance to use as schedule option
  // preparing select https://components.looker.com/components/forms/select/
  getDatagroups = async () => {
    const datagroups = await this.context.core40SDK.ok(
      this.context.core40SDK.all_datagroups()
    );
    if (datagroups === undefined || datagroups.length === 0) {
      return [];
    } else {
      const datagroupNames = datagroups
        .map((d) => d.model_name + "::" + d.name)
        .sort()
        .map((d) => {
          return { value: d, label: d };
        });
      datagroupNames.unshift({ value: " ", label: "" }); // html select tag does not reset to ""
      return datagroupNames;
    }
  };

  // returns schedule object from scheduledPlans[], returns [] if not found
  extractSchedule = (scheduledPlans: any, id: number): any => {
    return scheduledPlans.filter((obj: any) => obj.id === id)[0];
  };

  // compare scheduled plan id arrays and process deletes
  deleteSchedules = (
    storedPlanIds: (number | undefined)[],
    currentPlanIds: number[]
  ) => {
    if (storedPlanIds === undefined) {
      return;
    }

    for (let s of storedPlanIds) {
      if (s === undefined) {
        continue;
      }
      if (!currentPlanIds.includes(s)) {
        this.deleteSchedule(s);
      }
    }
  };

  // delete schedule plan
  deleteSchedule = async (s: number) => {
    console.log("deleting schedule id: " + s);

    await this.context.core40SDK.ok(
      this.context.core40SDK.delete_scheduled_plan(s)
    );
  };

  // create ScheduledPlan object
  writeScheduledPlanObject = (
    rowDetails: IScheduledPlanTable,
    scheduledPlanDestinations: any,
    filtersString: string
  ) => {
    const writeScheduledPlan: IWriteScheduledPlanNulls = {
      user_id: rowDetails.owner_id,
      name: rowDetails.name,
      dashboard_id: this.state.selectedDashId,
      timezone: rowDetails.timezone,
      include_links: rowDetails.include_links,
      run_as_recipient: rowDetails.run_as_recipient,
      scheduled_plan_destination: scheduledPlanDestinations,
      ...(rowDetails.crontab !== "" && {
        crontab: rowDetails.crontab,
        datagroup: null,
      }),
      ...(rowDetails.datagroup !== " " && {
        datagroup: rowDetails.datagroup,
        crontab: null,
      }),
      ...(filtersString !== "" && { filters_string: filtersString }),

      long_tables: false,
      pdf_paper_size: null,
      pdf_landscape: false,
      ...(["wysiwyg_pdf", "assembled_pdf"].includes(rowDetails.format) && {
        long_tables: rowDetails.long_tables,
      }),
      ...(["wysiwyg_pdf", "assembled_pdf"].includes(rowDetails.format) &&
        rowDetails.pdf_paper_size !== "" && {
          pdf_paper_size: rowDetails.pdf_paper_size,
          pdf_landscape: rowDetails.pdf_landscape,
        }),
    };

    // console.log(JSON.stringify(writeScheduledPlan, null, 2));

    return writeScheduledPlan;
  };

  // create schedule plan
  createSchedule = async (newSchedule: IScheduledPlanTable) => {
    console.log("creating new schedule");

    const scheduledPlanDestinations = this.writeScheduledPlanDestinations(
      newSchedule
    );
    const filtersString = this.stringifyFilters(newSchedule);

    const writeScheduledPlan = this.writeScheduledPlanObject(
      newSchedule,
      scheduledPlanDestinations,
      filtersString
    );

    const response = await this.context.core40SDK.ok(
      this.context.core40SDK.create_scheduled_plan(writeScheduledPlan)
    );

    // console.log(response); // todo return when 422
    return response;
  };

  // update schedule with new data in table
  updateSchedule = async (currentSchedule: any, storedSchedule: any) => {
    if (!isEqual(currentSchedule, storedSchedule)) {
      console.log("Updating schedule id: " + currentSchedule.id);

      const scheduledPlanDestinations = this.writeScheduledPlanDestinations(
        currentSchedule
      );
      const filtersString = this.stringifyFilters(currentSchedule);

      const updateScheduledPlan = this.writeScheduledPlanObject(
        currentSchedule,
        scheduledPlanDestinations,
        filtersString
      );

      const response = await this.context.core40SDK.ok(
        this.context.core40SDK.update_scheduled_plan(
          currentSchedule.id,
          updateScheduledPlan
        )
      );
      // console.log(response); // todo return when 422

      return response;
    } else {
      console.log("No update to schedule id: " + currentSchedule.id);
    }
    return;
  };

  ///////////////////////////////////////////////////

  getDash = async (dash_id: number) => {
    this.setState({
      selectedDashId: dash_id,
      runningQuery: true,
      errorMessage: undefined,
      notificationMessage: undefined,
    });

    try {
      const dash = await this.context.core40SDK.ok(
        this.context.core40SDK.dashboard(dash_id.toString())
      );
      // console.table(dash)

      if (dash.deleted == true) {
        this.setState({
          selectedDashId: undefined,
          currentDash: undefined,
          datagroups: [],
          errorMessage: "Dashboard is deleted.",
          notificationMessage: undefined,
          schedulesArray: [],
          schedulesArrayBackup: [],
          runningQuery: false,
        });
        return;
      }

      const schedulesArray = await this.getScheduledPlans(dash_id);
      const datagroups = await this.getDatagroups();

      this.setState({
        selectedDashId: dash_id,
        currentDash: dash,
        datagroups: datagroups,
        schedulesArray: schedulesArray,
        schedulesArrayBackup: schedulesArray,
        runningQuery: false,
        hiddenColumns: [...ADVANCED_FIELDS, ...FORMATTING_FIELDS],
        checkboxStatus: {
          "Show All": "mixed",
          "Read-Only": true,
          Required: true,
          Advanced: false,
          Formatting: false,
          Filters: true,
        },
      });
    } catch (error) {
      this.setState({
        selectedDashId: undefined,
        currentDash: undefined,
        datagroups: [],
        schedulesArray: [],
        schedulesArrayBackup: [],
        runningQuery: false,
        errorMessage: "Unable to load Dashboard.",
        notificationMessage: undefined,
      });
    }
  };

  // updating checkbox status
  handleVisible = (hiddenColumns: string[], checkboxStatus: any) => {
    // console.log(hiddenColumns);
    // console.log(checkboxStatus);

    this.setState({
      hiddenColumns: hiddenColumns,
      checkboxStatus: checkboxStatus,
    });
  };

  // When our cell renderer calls syncData, we'll use the rowIndex, columnId and new value to update the original data
  syncData = (rowIndex: number, columnId: string, value: string) => {
    // console.log(rowIndex, columnId, value);

    const editedData = this.state.schedulesArray.map(
      (row: number, index: number) => {
        if (index === rowIndex) {
          return {
            ...this.state.schedulesArray[rowIndex],
            [columnId]: value,
          };
        }
        return row;
      }
    );

    this.setState({
      schedulesArray: editedData,
      errorMessage: undefined,
      notificationMessage: undefined,
    });

    // console.table(this.state.schedulesArray);
    // console.table(this.state.schedulesArrayBackup);
  };

  // remove all changes
  resetData = () => {
    console.log("resetting data");

    this.setState({
      schedulesArray: this.state.schedulesArrayBackup,
      errorMessage: undefined,
      notificationMessage: "All changes have been reverted",
    });
  };

  // sets default values for rows
  setDefaultRowParams = (emptyRow: any) => {
    emptyRow.datagroup = " ";
    emptyRow.format = "wysiwyg_pdf";
    emptyRow.timezone = "UTC";
    emptyRow.run_as_recipient = false;
    emptyRow.apply_vis = false;
    emptyRow.apply_formatting = false;
    emptyRow.long_tables = false;
    emptyRow.pdf_landscape = false;

    return emptyRow;
  };

  // add row to bottom of table
  addRow = () => {
    console.log("adding row");

    const newArray = cloneDeep(this.state.schedulesArray);
    const emptyRow = cloneDeep(newArray[0]);
    Object.keys(emptyRow).forEach((v) => (emptyRow[v] = ""));

    newArray.push(this.setDefaultRowParams(emptyRow));

    let rowCount = 1;
    if (this.state.notificationMessage?.includes("Added")) {
      rowCount =
        Number(
          this.state.notificationMessage.substr(
            0,
            this.state.notificationMessage.indexOf(" ")
          )
        ) + 1;
    }

    this.setState({
      schedulesArray: newArray,
      errorMessage: undefined,
      notificationMessage: rowCount + " Row(s) Added",
    });
  };

  // delete row from table and scheduled_plan (if it exists)
  // rows coming in descending order to slice rows off table one at a time
  deleteRow = async (rows: { rowIndex: number; scheduleId: string }[]) => {
    console.log("deleting rows:");
    console.table(rows);

    this.setState({
      runningUpdate: true,
    });

    const newArray = cloneDeep(this.state.schedulesArray);

    for (let i = 0; i < rows.length; i++) {
      const rowIndex = rows[i].rowIndex;
      const scheduleId = rows[i].scheduleId;
      if (scheduleId !== "") {
        // console.log("deleting schedule " + scheduleId);
        await this.deleteSchedule(parseInt(scheduleId));
      }

      // console.log("removing row: " + rowIndex);
      newArray.splice(rowIndex, 1);
    }

    // if no more rows, recreate table
    if (newArray.length === 0 && this.state.selectedDashId) {
      const scheduleHeader = await this.prepareEmptyTable(
        this.state.selectedDashId
      );

      this.setState({
        schedulesArray: scheduleHeader,
        schedulesArrayBackup: scheduleHeader,
        runningUpdate: false,
        errorMessage: undefined,
        notificationMessage: "Row(s) Deleted",
      });
      return;
    }

    this.setState({
      schedulesArray: newArray,
      schedulesArrayBackup: newArray,
      runningUpdate: false,
      errorMessage: undefined,
      notificationMessage: "Row(s) Deleted",
    });
  };

  // updates scheduled_plan or creates new if it doesn't exist
  updateRow = async (rowIndex: number[], schedulesToAdd: any[]) => {
    console.log("updating rows");
    console.log(schedulesToAdd);

    this.setState({
      runningUpdate: true,
      notificationMessage: undefined,
    });

    const updateTable = cloneDeep(this.state.schedulesArray);
    const currentPlanIds = schedulesToAdd.map((s: IScheduledPlan) => s.id);
    // console.log(currentPlanIds);

    if (!this.state.selectedDashId) {
      return;
    }

    try {
      const schedulesToCheck = await this.getScheduledPlans(
        this.state.selectedDashId
      );

      // ensure all key fields are filled out
      if (
        !schedulesToAdd.reduce(
          (acc: boolean, row: any) => acc && this.validateRow(row),
          true
        )
      ) {
        this.setState({
          errorMessage:
            "Required fields missing. Ensure all fields have values: " +
            REQUIRED_FIELDS.join(", ") +
            ", " +
            REQUIRED_TRIGGER_FIELDS.join(" or "),
          notificationMessage: undefined,
          runningUpdate: false,
        });
        return;
      }

      // todo validate cron, owner_id, recipients

      // creates new scheduled_plan if it doesn't exist, or, update scheduled_plan if it's been modified
      for (let i = 0; i < schedulesToAdd.length; i++) {
        // assume if schedule has no id in table it is new
        if (schedulesToAdd[i].id === "") {
          const response = await this.createSchedule(schedulesToAdd[i]);
          const responseJson: IScheduledPlanTable = JSON.parse(
            JSON.stringify(response)
          );
          updateTable[rowIndex[i]] = this.assignRowValues(responseJson);

          continue;
        }

        const storedSchedule = this.extractSchedule(
          schedulesToCheck,
          schedulesToAdd[i].id
        );
        // console.table(schedulesToAdd[i]);
        // console.table(storedSchedule);

        const response = await this.updateSchedule(
          schedulesToAdd[i],
          storedSchedule
        );
        if (response !== undefined) {
          const responseJson: IScheduledPlanTable = JSON.parse(
            JSON.stringify(response)
          );
          updateTable[rowIndex[i]] = this.assignRowValues(responseJson);
        }
      }

      this.setState({
        schedulesArray: updateTable,
        schedulesArrayBackup: updateTable,
        runningUpdate: false,
        errorMessage: undefined,
        notificationMessage: "Row(s) Updated",
      });
    } catch (error) {
      this.setState({
        runningUpdate: false,
        errorMessage: "Error updating schedules.",
        notificationMessage: undefined,
      });
    }
  };

  // send 1:all rows to scheduled_plan_run_once
  testRow = async (rowIndex: number[], schedulesToTest: any[]) => {
    console.log("testing rows");
    console.log(schedulesToTest);

    this.setState({
      runningUpdate: true,
    });

    try {
      // ensure all key fields are filled out
      if (
        !schedulesToTest.reduce(
          (acc: boolean, row: any) => acc && this.validateRow(row),
          true
        )
      ) {
        this.setState({
          errorMessage:
            "Required fields missing. Ensure all fields have values: " +
            REQUIRED_FIELDS.join(", ") +
            ", " +
            REQUIRED_TRIGGER_FIELDS.join(" or "),
          notificationMessage: undefined,
          runningUpdate: false,
        });
        return;
      }

      // todo validate cron, owner_id, recipients

      // endpoint is rate limited to 10 calls per second
      const delay = (i: number) => new Promise((r) => setTimeout(r, i));

      for (let i = 0; i < schedulesToTest.length; i++) {
        const scheduledPlanDestinations = this.writeScheduledPlanDestinations(
          schedulesToTest[i]
        );
        const filtersString = this.stringifyFilters(schedulesToTest[i]);

        const testScheduledPlan = this.writeScheduledPlanObject(
          schedulesToTest[i],
          scheduledPlanDestinations,
          filtersString
        );

        await delay(200);
        const response = await this.context.core40SDK.ok(
          this.context.core40SDK.scheduled_plan_run_once(testScheduledPlan)
        );
        // console.log(response);
      }

      this.setState({
        runningUpdate: false,
        errorMessage: undefined,
        notificationMessage: "Test(s) Sent",
      });
    } catch (error) {
      this.setState({
        runningUpdate: false,
        errorMessage: "Error testing schedules.",
        notificationMessage: undefined,
      });
    }
  };

  // disabling 1:all rows
  disableRow = async (rowIndex: number[], schedulesToDisable: any[]) => {
    console.log("disabling rows");
    console.log(schedulesToDisable);

    this.setState({
      runningUpdate: true,
    });

    try {
      // ensure all rows are created and have ids
      if (
        !schedulesToDisable.reduce(
          (acc: boolean, row: any) => acc && row.id !== "",
          true
        )
      ) {
        this.setState({
          errorMessage: "Cannot disable schedule(s) that are not created.",
          notificationMessage: undefined,
          runningUpdate: false,
        });
        return;
      }

      const updateTable = cloneDeep(this.state.schedulesArray);

      for (let i = 0; i < schedulesToDisable.length; i++) {
        const scheduledPlanDestinations = this.writeScheduledPlanDestinations(
          schedulesToDisable[i]
        );
        const filtersString = this.stringifyFilters(schedulesToDisable[i]);

        const disabledScheduledPlan = this.writeScheduledPlanObject(
          schedulesToDisable[i],
          scheduledPlanDestinations,
          filtersString
        );
        disabledScheduledPlan.enabled = false;

        const response = await this.context.core40SDK.ok(
          this.context.core40SDK.update_scheduled_plan(
            schedulesToDisable[i].id,
            disabledScheduledPlan
          )
        );
        updateTable[rowIndex[i]].enabled = response.enabled; // update table with enabled=false
        // console.log(response); // todo return when 422
      }

      this.setState({
        schedulesArray: updateTable,
        schedulesArrayBackup: updateTable,
        runningUpdate: false,
        errorMessage: undefined,
        notificationMessage: "Schedule(s) have been disabled",
      });
    } catch (error) {
      this.setState({
        runningUpdate: false,
        errorMessage: "Error disabling schedules.",
        notificationMessage: undefined,
      });
    }
  };

  // enable 1:all rows
  enableRow = async (rowIndex: number[], schedulesToEnable: any[]) => {
    console.log("disabling rows");
    console.log(schedulesToEnable);

    this.setState({
      runningUpdate: true,
    });

    try {
      // ensure all rows are created and have ids
      if (
        !schedulesToEnable.reduce(
          (acc: boolean, row: any) => acc && row.id !== "",
          true
        )
      ) {
        this.setState({
          errorMessage: "Cannot enable schedule(s) that are not created.",
          notificationMessage: undefined,
          runningUpdate: false,
        });
        return;
      }

      const updateTable = cloneDeep(this.state.schedulesArray);

      for (let i = 0; i < schedulesToEnable.length; i++) {
        const scheduledPlanDestinations = this.writeScheduledPlanDestinations(
          schedulesToEnable[i]
        );
        const filtersString = this.stringifyFilters(schedulesToEnable[i]);

        const enabledScheduledPlan = this.writeScheduledPlanObject(
          schedulesToEnable[i],
          scheduledPlanDestinations,
          filtersString
        );
        enabledScheduledPlan.enabled = true;

        const response = await this.context.core40SDK.ok(
          this.context.core40SDK.update_scheduled_plan(
            schedulesToEnable[i].id,
            enabledScheduledPlan
          )
        );
        updateTable[rowIndex[i]].enabled = response.enabled; // update table with enabled=true
        // console.log(response); // todo return when 422
      }

      this.setState({
        schedulesArray: updateTable,
        schedulesArrayBackup: updateTable,
        runningUpdate: false,
        errorMessage: undefined,
        notificationMessage: "Schedule(s) have been enabled",
      });
    } catch (error) {
      this.setState({
        runningUpdate: false,
        errorMessage: "Error enabling schedules.",
        notificationMessage: undefined,
      });
    }
  };

  render() {
    return (
      <>
        {this.state.errorMessage && (
          <MessageBar
            intent="critical"
            canDismiss
            onDismiss={() => {
              this.setState({
                errorMessage: undefined,
              });
            }}
          >
            {this.state.errorMessage}
          </MessageBar>
        )}

        <Box m="large">
          <Flex height="50px" justifyContent="space-between">
            <FlexItem mb="medium">
              <Text variant="secondary" mr="small">
                Enter A Dashboard ID:
              </Text>
              <InputText
                width="80"
                height="28"
                type="number"
                min="1"
                onKeyPress={this.handleKeyPress}
                onChange={this.handleDashChange}
                mr="small"
              />
              <Button size="small" mr="small" onClick={this.handleDashSubmit}>
                Go
              </Button>
            </FlexItem>

            <FlexItem width="40%">
              {this.state.runningQuery && (
                <Text
                  color="palette.charcoal500"
                  fontWeight="semiBold"
                  mr="large"
                >
                  Getting Schedules Data ...
                </Text>
              )}

              {this.state.runningUpdate && (
                <Text
                  color="palette.charcoal500"
                  fontWeight="semiBold"
                  mr="large"
                >
                  Processing ...
                </Text>
              )}

              {this.state.notificationMessage && (
                <MessageBar
                  intent="positive"
                  canDismiss
                  onDismiss={() => {
                    this.setState({
                      notificationMessage: undefined,
                    });
                  }}
                >
                  {this.state.notificationMessage}
                </MessageBar>
              )}
            </FlexItem>

            <FlexItem>
              {this.state.schedulesArray.length > 0 && (
                <>
                  <PopulateRows
                    popParams={this.state.populateParams}
                    resetPopParams={this.resetPopParams}
                    validPopParams={this.validPopParams}
                    handlePopQueryId={this.handlePopQueryId}
                    handlePopOwnerId={this.handlePopOwnerId}
                    handlePopName={this.handlePopName}
                    handlePopCron={this.handlePopCron}
                    handlePopSubmit={this.handlePopSubmit}
                  />{" "}
                  <Confirm
                    confirmLabel="Revert"
                    buttonColor="critical"
                    title="Revert Changes"
                    message="Are you sure you want to revert all changes?"
                    onConfirm={(close) => {
                      this.resetData();
                      close();
                    }}
                  >
                    {(open) => (
                      <Button color="critical" onClick={open}>
                        Revert
                      </Button>
                    )}
                  </Confirm>{" "}
                  <Confirm
                    buttonColor="key"
                    title="Update All"
                    message="Are you sure you want to update all schedules?"
                    onConfirm={(close) => {
                      const schedulesToAdd = JSON.parse(
                        JSON.stringify(this.state.schedulesArray)
                      );
                      const rowIndex: number[] = [];
                      schedulesToAdd.forEach((e: any, i: number) => {
                        rowIndex.push(i);
                      });
                      this.updateRow(rowIndex, schedulesToAdd);
                      close();
                    }}
                  >
                    {(open) => <Button onClick={open}>Update All</Button>}
                  </Confirm>
                </>
              )}
            </FlexItem>
          </Flex>

          <Box style={{ float: "left" }}>
            <Heading
              as="h2"
              fontWeight="semiBold"
              style={{ cursor: "pointer", display: "inline" }}
              title={
                this.state.currentDash && this.state.currentDash.folder
                  ? "[" +
                    this.state.currentDash.folder.name +
                    "] " +
                    this.state.currentDash.title
                  : ""
              }
              onClick={() => {
                this.context.extensionSDK.openBrowserWindow(
                  "/dashboards/" + this.state.selectedDashId,
                  "_blank"
                );
              }}
            >
              {this.state.currentDash && this.state.currentDash.folder
                ? " " + this.state.currentDash.title
                : ""}
            </Heading>
          </Box>

          <Flex width="100%">
            <SchedulesTable
              results={this.state.schedulesArray}
              datagroups={this.state.datagroups}
              hiddenColumns={this.state.hiddenColumns}
              handleVisible={this.handleVisible}
              checkboxStatus={this.state.checkboxStatus}
              syncData={this.syncData}
              addRow={this.addRow}
              deleteRow={this.deleteRow}
              updateRow={this.updateRow}
              testRow={this.testRow}
              disableRow={this.disableRow}
              enableRow={this.enableRow}
              openExploreWindow={this.openExploreWindow}
            />
          </Flex>
        </Box>
      </>
    );
  }
}
