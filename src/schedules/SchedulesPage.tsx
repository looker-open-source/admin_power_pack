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
  Box,
  Button,
  ComboboxOptionObject,
  Confirm,
  Flex,
  FlexItem,
  Heading,
  IconButton,
  InputText,
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
import {
  DEBUG,
  ADVANCED_FIELDS,
  FORMATTING_FIELDS,
  KEY_FIELDS,
  REQUIRED_FIELDS,
  REQUIRED_TRIGGER_FIELDS,
} from "./constants";
import { SchedulesTable } from "./SchedulesTable";
import { PopulateParams, PopulateRows } from "./PopulateRows";

interface ExtensionState {
  currentDash?: IDashboard;
  selectedDashId?: number;
  datagroups: ComboboxOptionObject[]; // array of datagroup string names
  users: ComboboxOptionObject[]; // array of user ids and display names
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
  owner_id: string;
  recipients: string; // converting Array<string> to string
  run_as_recipient?: any;
  include_links?: any;
  [key: string]: any; // needed to dynamically display filters
  scheduled_plan_destination: IScheduledPlanDestination[]; // overriding to make this required
  user: IUserPublicExtended; // overriding to make this required
}

export interface IUserPublicExtended extends IUserPublic {
  id: number; // overriding to make this required
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
      users: [],
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
      if (DEBUG) {
        console.log("Params supplied from Populate Rows form:");
        console.log(params);
      }

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

      if (DEBUG) {
        console.log(`Query ${params.queryId} results:`);
        console.log(results.data);
        console.log(`Field Mapper based on query: ${params.queryId}`);
        console.table(fieldMapper);
      }

      const newArray = cloneDeep(this.state.schedulesArray);

      for (let i = 0; i < results.data.length; i++) {
        let newRow = cloneDeep(newArray[0]);
        Object.keys(newRow).forEach((k) => (newRow[k] = "")); // clear row values first
        newRow = this.setDefaultRowParams(newRow);

        Object.keys(newRow).forEach((k: any) => {
          if (!KEY_FIELDS.includes(k) && fieldMapper[k] !== undefined) {
            newRow[k] = results.data[i][fieldMapper[k]].value;
          }
        });

        newRow.owner_id = params.ownerId;
        newRow.name = params.scheduleName;
        newRow.crontab = params.cron;

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

  /////////////////////////////////////////////////////////////////////

  ///////////////// DASHBOARD SEARCH AND PREP FOR TABLE ////////////////

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

    this.getDash(this.state.selectedDashId);
  };

  getDash = async (dash_id: number) => {
    this.setState({
      selectedDashId: dash_id,
      currentDash: undefined,
      runningQuery: true,
      errorMessage: undefined,
      notificationMessage: undefined,
      schedulesArray: [],
      schedulesArrayBackup: [],
    });

    try {
      const dash = await this.context.core40SDK.ok(
        this.context.core40SDK.dashboard(dash_id.toString())
      );
      const schedulesArray = await this.getScheduledPlans(dash_id, dash);
      const datagroups = await this.getDatagroups();
      const users = await this.getAllUsers();

      if (DEBUG) {
        console.log(`Dashboard ${dash_id} found:`);
        console.log(dash);
      }

      if (dash.deleted == true) {
        this.setState({
          errorMessage: "Dashboard is deleted.",
          runningQuery: false,
        });
        return;
      }

      this.setState({
        currentDash: dash,
        datagroups: datagroups,
        users: users,
        schedulesArray: schedulesArray,
        schedulesArrayBackup: schedulesArray,
        runningQuery: false,
        hiddenColumns: [...ADVANCED_FIELDS, ...FORMATTING_FIELDS],
        checkboxStatus: {
          "Show All": "mixed",
          Required: true,
          Advanced: false,
          Formatting: false,
          Filters: true,
        },
      });
    } catch (error) {
      this.setState({
        errorMessage: "Unable to load Dashboard.",
        runningQuery: false,
      });
    }
  };

  // loads empty first row in table
  // gets called if Dashboard has no schedules, or, if all rows have been deleted from table
  prepareEmptyTable = async (currentDash: IDashboard) => {
    const jsonDash: any = cloneDeep(currentDash);

    const filtersArray = jsonDash.dashboard_filters.map((f: any) => f.name);
    const headerArray = [...KEY_FIELDS, ...filtersArray];

    const scheduleHeader: any = {};
    headerArray.reduce(
      (acc, item) => (scheduleHeader[item] = ""),
      scheduleHeader
    );

    return [this.setDefaultRowParams(scheduleHeader)];
  };

  // converts date to UTC string
  formatDate = (date: Date | undefined) => {
    if (date === undefined || date === null) {
      return "N/A";
    }
    const formattedDate = new Date(date);
    return formattedDate.toUTCString();
  };

  // prepares row for table from IScheduledPlanTable object
  assignRowValues = (s: IScheduledPlanTable) => {
    const formattedRow: any = {};

    formattedRow.details = {
      id: s.id,
      enabled: s.enabled,
      created_at: this.formatDate(s.created_at),
      updated_at: this.formatDate(s.updated_at),
      next_run_at: this.formatDate(s.next_run_at),
      last_run_at: this.formatDate(s.last_run_at),
    };

    formattedRow.name = s.name;
    formattedRow.timezone = s.timezone;
    formattedRow.include_links = s.include_links;

    formattedRow.owner_id = s.user.id.toString(); // change from number to string for better compatability with Select
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
    const filters_string = decodeURIComponent(s.filters_string || "")
      .slice(1)
      .split("&filter_config=")[0];
    let filter = filters_string.split("&") || "";

    if (filter[0] !== "") {
      filter.forEach((f: string) => {
        let filterValue: string[] = f.split("=");
        formattedRow[filterValue[0]] = filterValue[1];
      });
    }

    return formattedRow;
  };

  // get all scheduled plans for dashboard and prepare for table
  getScheduledPlans = async (dash_id: number, dash: IDashboard) => {
    const schedules = await this.context.core40SDK.ok(
      this.context.core40SDK.scheduled_plans_for_dashboard({
        dashboard_id: dash_id,
        all_users: true,
        fields:
          "enabled,id,name,filters_string,crontab,datagroup,scheduled_plan_destination(type,address,message,format,apply_vis,apply_formatting),run_as_recipient,include_links,timezone,long_tables,pdf_paper_size,pdf_landscape,user(id,display_name),created_at,updated_at, next_run_at,last_run_at",
      })
    );

    // convert to json to make deep copy
    const schedulesArray: IScheduledPlanTable[] = JSON.parse(
      JSON.stringify(schedules)
    );

    // only keep email based schedules, for now.
    // need to check for s.user because a deleted users schedules will still appear, however these schedules cannot be patched and thus are useless
    const emailSchedulesArray = schedulesArray.filter(
      (s) => s.scheduled_plan_destination[0].type === "email" && s.user
    );

    const scheduleHeader = await this.prepareEmptyTable(dash);

    if (emailSchedulesArray.length === 0) {
      if (DEBUG) {
        console.log("No schedules found. Preparing empty table:");
        console.log(scheduleHeader[0]);
      }
      return scheduleHeader;
    } else {
      emailSchedulesArray.forEach((s: IScheduledPlanTable) => {
        const formattedRow = this.assignRowValues(s);

        // add empty filter values for schedules
        for (let [key, value] of Object.entries(scheduleHeader[0])) {
          if (!(key in formattedRow)) {
            formattedRow[key] = "";
          }
        }

        scheduleHeader.push(formattedRow);
      });

      if (DEBUG) {
        console.log("Schedules returned from Looker:");
        console.table(schedules);
        console.log("Schedules prepared for table:");
        console.table(scheduleHeader.slice(1));
      }

      return scheduleHeader.slice(1);
    }
  };

  // get all datagroups defined on instance to use as schedule option
  // todo filter deleted datagroups - not currently possible
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

      // first element is " " as html select tag does not reset to ""
      datagroupNames.unshift({ value: " ", label: "" });

      if (DEBUG) {
        console.log("Datagroups found:");
        console.log(datagroupNames);
      }

      return datagroupNames;
    }
  };

  getAllUsers = async () => {
    const allUsers = await this.context.core40SDK.ok(
      this.context.core40SDK.all_users({
        fields: "id, display_name, is_disabled",
        sorts: "first_name",
      })
    );

    const usersSelect = allUsers
      .filter((u: any) => !u.is_disabled)
      .map((u: any) => {
        return { value: u.id.toString(), label: u.display_name };
      });

    if (DEBUG) {
      console.log("All users retrieved:");
      console.log(usersSelect);
    }

    return usersSelect;
  };

  ///////////////////////////////////////////////////

  //////////////// HELPER FUNCTIONS /////////////////

  // tooltip for dashboard title
  formatDashboardTitleSpace = (): string => {
    if (this.state.currentDash && this.state.currentDash.folder) {
      return (
        "[" +
        this.state.currentDash.folder.name +
        "] " +
        this.state.currentDash.title
      );
    }
    return "";
  };

  // open window to dashboard with filters
  openDashboardWindow = (rowIndex: number): void => {
    const filtersString = this.stringifyFilters(
      this.state.schedulesArray[rowIndex]
    );
    const url = `/dashboards/${this.state.selectedDashId}${filtersString}`;
    this.context.extensionSDK.openBrowserWindow(url, "_blank");
  };

  // open window to System Activity Explore for history of schedule plan
  openExploreWindow = (scheduledPlanID: number): void => {
    const url = `/explore/system__activity/scheduled_plan?fields=scheduled_job.created_time,scheduled_job.finalized_time,scheduled_job.name,dashboard.title,user.name,scheduled_job.status,scheduled_job.status_detail,scheduled_plan.destination_addresses,scheduled_plan_destination.type,scheduled_plan_destination.format&f[scheduled_plan.id]=${scheduledPlanID}&sorts=scheduled_job.finalized_time+desc&limit=500`;
    this.context.extensionSDK.openBrowserWindow(url, "_blank");
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
  // keeps empty filters to preserve table (defaults to "is any value/time")
  stringifyFilters = (newSchedule: IScheduledPlanTable): string => {
    let filtersString = "?";
    for (let [key, value] of Object.entries(newSchedule)) {
      if (KEY_FIELDS.includes(key)) {
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

  // sets default values for rows
  setDefaultRowParams = (row: any) => {
    row.datagroup = " ";
    row.format = "wysiwyg_pdf";
    row.timezone = "UTC";
    row.run_as_recipient = false;
    row.apply_vis = false;
    row.apply_formatting = false;
    row.long_tables = false;
    row.pdf_landscape = false;

    return row;
  };

  // create ScheduledPlan object
  writeScheduledPlanObject = (
    rowDetails: IScheduledPlanTable,
    scheduledPlanDestinations: any,
    filtersString: string
  ) => {
    const writeScheduledPlan: IWriteScheduledPlanNulls = {
      user_id: Number(rowDetails.owner_id),
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

    if (DEBUG) {
      console.log("ScheduledPlan object created:");
      console.log(JSON.stringify(writeScheduledPlan, null, 2));
    }

    return writeScheduledPlan;
  };

  // create new schedule plan
  createSchedule = async (newSchedule: IScheduledPlanTable) => {
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

    if (DEBUG) {
      console.log("Create new schedule response:");
      console.log(JSON.stringify(response, null, 2)); // todo return when 422
    }

    return response;
  };

  // update schedule with new data in table
  updateSchedule = async (currentSchedule: any, storedSchedule: any) => {
    if (isEqual(currentSchedule, storedSchedule)) {
      if (DEBUG) {
        console.log(`No update for schedule id: ${currentSchedule.details.id}`);
      }

      return;
    }

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
        currentSchedule.details.id,
        updateScheduledPlan
      )
    );

    if (DEBUG) {
      console.log(
        `Update schedule response for: ${currentSchedule.details.id}`
      );
      console.log(JSON.stringify(response, null, 2)); // todo return when 422
    }

    return response;
  };

  /////////////////////////////////////////////////////////////////

  ////////////////// FUNCTIONS FOR SCHEDULESTABLE /////////////////

  // updating checkbox status for showing/hiding grouped headings
  handleVisible = (hiddenColumns: string[], checkboxStatus: any) => {
    if (DEBUG) {
      console.log(`Hidden Columns: ${hiddenColumns}`);
      console.log("Checkbox Status:");
      console.log(checkboxStatus);
    }

    this.setState({
      hiddenColumns: hiddenColumns,
      checkboxStatus: checkboxStatus,
    });
  };

  // When our cell renderer calls syncData, we'll use the rowIndex, columnId and new value to update the original data
  syncData = (rowIndex: number, columnId: string, value: string) => {
    if (DEBUG) {
      console.log(
        `Updating row '${rowIndex + 1}' column '${columnId}' with: ${value}`
      );
    }

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
  };

  // remove all local changes (reverts to what is stored in Looker)
  resetData = () => {
    if (DEBUG) {
      console.log("resetting data");
    }

    this.setState({
      schedulesArray: this.state.schedulesArrayBackup,
      errorMessage: undefined,
      notificationMessage: "All changes have been reverted",
    });
  };

  // add row to bottom of table
  addRow = () => {
    const newArray = cloneDeep(this.state.schedulesArray);
    const firstRow = cloneDeep(newArray[0]);
    Object.keys(firstRow).forEach((v) => (firstRow[v] = ""));
    const emptyRow = this.setDefaultRowParams(firstRow);

    if (DEBUG) {
      console.log("Adding empty row:");
      console.log(emptyRow);
    }

    newArray.push(emptyRow);

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
    if (DEBUG) {
      console.log("Deleting Rows:");
      console.table(rows);
    }

    if (!this.state.currentDash) {
      this.setState({
        notificationMessage: "Dashboard not found",
      });
      return;
    } else {
      this.setState({
        runningUpdate: true,
      });
    }

    const newArray = cloneDeep(this.state.schedulesArray);

    for (let i = 0; i < rows.length; i++) {
      const rowIndex = rows[i].rowIndex;
      const scheduleId = rows[i].scheduleId;
      if (scheduleId !== undefined) {
        const response = await this.context.core40SDK.ok(
          this.context.core40SDK.delete_scheduled_plan(parseInt(scheduleId))
        );

        if (DEBUG) {
          console.log(`Delete schedule response for: ${scheduleId}`);
          console.log(JSON.stringify(response, null, 2));
        }
      }

      newArray.splice(rowIndex, 1);
    }

    // if no more rows, recreate table
    if (newArray.length === 0 && this.state.selectedDashId) {
      const scheduleHeader = await this.prepareEmptyTable(
        this.state.currentDash
      );

      if (DEBUG) {
        console.log("All rows have been deleted. Preparing empty table:");
        console.log(scheduleHeader[0]);
      }

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

  // create/update schedule - updates scheduled_plan or creates new if it doesn't exist
  updateRow = async (rowIndex: number[], schedulesToAdd: any[]) => {
    if (DEBUG) {
      console.log("Creating / Updating rows:");
      console.table(schedulesToAdd);
    }

    this.setState({
      runningUpdate: true,
      notificationMessage: undefined,
    });

    const updateTable = cloneDeep(this.state.schedulesArray);

    if (!this.state.selectedDashId || !this.state.currentDash) {
      this.setState({
        runningUpdate: false,
        notificationMessage: "Dashboard not found",
      });
      return;
    }

    try {
      const schedulesToCheck = await this.getScheduledPlans(
        this.state.selectedDashId,
        this.state.currentDash
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
        // assume schedule is new if it has no details in table
        if (schedulesToAdd[i].details === "") {
          const response = await this.createSchedule(schedulesToAdd[i]);
          const responseJson: IScheduledPlanTable = JSON.parse(
            JSON.stringify(response)
          );
          updateTable[rowIndex[i]] = this.assignRowValues(responseJson);

          continue;
        }

        // assume schedule exists and check if it has changed, then update
        const storedSchedule = schedulesToCheck.filter(
          (obj: any) => obj.details.id === schedulesToAdd[i].details.id
        )[0];

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

  // run once - send 1:all rows to scheduled_plan_run_once
  testRow = async (rowIndex: number[], schedulesToTest: any[]) => {
    if (DEBUG) {
      console.log("Testing rows:");
      console.table(schedulesToTest);
    }

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

      // endpoint is rate limited to 10 calls per second so delaying 200ms between run once calls
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

        if (DEBUG) {
          console.log(
            `Run schedule once response for row ${
              rowIndex[i] + 1
            } schedule ID: ${schedulesToTest[i].details.id}`
          );
          console.log(JSON.stringify(response, null, 2));
        }
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
    if (DEBUG) {
      console.log("Disabling rows:");
      console.table(schedulesToDisable);
    }

    this.setState({
      runningUpdate: true,
    });

    try {
      // ensure all rows are created and have ids
      if (
        !schedulesToDisable.reduce(
          (acc: boolean, row: any) => acc && row.details !== "",
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
            schedulesToDisable[i].details.id,
            disabledScheduledPlan
          )
        );
        updateTable[rowIndex[i]].details.enabled = response.enabled; // update table with enabled=false

        if (DEBUG) {
          console.log(
            `Disable schedule response for: ${schedulesToDisable[i].details.id}`
          );
          console.log(JSON.stringify(response, null, 2)); // todo return when 422
        }
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
    if (DEBUG) {
      console.log("Enabling rows:");
      console.table(schedulesToEnable);
    }

    this.setState({
      runningUpdate: true,
    });

    try {
      // ensure all rows are created and have ids
      if (
        !schedulesToEnable.reduce(
          (acc: boolean, row: any) => acc && row.details !== "",
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
            schedulesToEnable[i].details.id,
            enabledScheduledPlan
          )
        );
        updateTable[rowIndex[i]].details.enabled = response.enabled; // update table with enabled=true
        if (DEBUG) {
          console.log(
            `Enable schedule response for: ${schedulesToEnable[i].details.id}`
          );
          console.log(JSON.stringify(response, null, 2)); // todo return when 422
        }
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
              <Text variant="secondary" mr="xxsmall">
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
              <Button size="small" mr="xxsmall" onClick={this.handleDashSubmit}>
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

          <Flex>
            {this.state.currentDash && (
              <>
                <Heading
                  as="h2"
                  fontWeight="semiBold"
                  title={this.formatDashboardTitleSpace()}
                >
                  {this.state.currentDash.title}
                </Heading>
                <IconButton
                  label="Go to Dashboard"
                  icon="External"
                  size="small"
                  onClick={() => {
                    this.context.extensionSDK.openBrowserWindow(
                      "/dashboards/" + this.state.selectedDashId,
                      "_blank"
                    );
                  }}
                />
              </>
            )}
          </Flex>

          <Flex width="100%">
            <SchedulesTable
              results={this.state.schedulesArray}
              datagroups={this.state.datagroups}
              users={this.state.users}
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
              openDashboardWindow={this.openDashboardWindow}
            />
          </Flex>
        </Box>
      </>
    );
  }
}
