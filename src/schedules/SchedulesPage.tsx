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
  ButtonOutline,
  Confirm,
  ConfirmLayout,
  Dialog,
  Flex,
  FlexItem,
  Heading,
  IconButton,
  MessageBar,
  Paragraph,
  Select,
  Spinner,
  Text,
} from "@looker/components";
import { ExtensionContext } from "@looker/extension-sdk-react";
import { isEqual, cloneDeep, chain, sortBy, groupBy } from "lodash";
import Papa from "papaparse";
import React from "react";
import { RouteComponentProps, withRouter } from "react-router-dom";
import { hot } from "react-hot-loader/root";
import { IDashboard, IScheduledPlan } from "@looker/sdk/lib/4.0/models";
import {
  DEBUG,
  ADVANCED_FIELDS,
  FORMATTING_FIELDS,
  KEY_FIELDS,
  REQUIRED_FIELDS,
  REQUIRED_TRIGGER_FIELDS,
  ExtensionState,
  IWriteScheduledPlanNulls,
  IScheduledPlanTable,
} from "./constants"; // interfaces
import {
  validationTypeCron,
  translateCron,
  newGroupOptions,
  MonospaceTextArea,
} from "./helper";
import { SchedulesTable } from "./SchedulesTable";
import { GlobalActions } from "./GlobalActions";
import { GeneratePlans } from "./GeneratePlans";

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
      selectedDashId: "",
      dashSearchString: "",
      dashboards: [],
      datagroups: [],
      users: [],
      schedulesArray: [],
      schedulesArrayBackup: [],
      runningQuery: false,
      runningUpdate: false,
      hiddenColumns: [],
      checkboxStatus: undefined,
      toggleLog: false,
      logMessages: [],
    };
  }

  //////////////// RUN ON PAGE LOAD ////////////////

  componentDidMount = async () => {
    const { initializeError } = this.context;
    if (initializeError) {
      return;
    }

    this.setState({
      notificationMessage: "Retrieving all dashboards...",
    });

    try {
      const [dashboards, datagroups, users] = await Promise.all([
        this.getAllDashboards(),
        this.getDatagroups(),
        this.getAllUsers(),
      ]);

      this.setState({
        dashboards: dashboards,
        datagroups: datagroups,
        users: users,
        notificationMessage: "Retrieving all dashboards...Done",
      });
    } catch (error) {
      this.setState({
        errorMessage: `Unable to load Dashboards: ${error}`,
        runningQuery: false,
        notificationMessage: undefined,
      });

      return;
    }
  };

  // get all Dashboards for drop down Select
  getAllDashboards = async () => {
    const dashboards: any = await this.context.core40SDK.ok(
      this.context.core40SDK.all_dashboards("id,title,folder(id,name)")
    );

    const dashboardList = chain(dashboards)
      .filter((d: any) => d.folder.id !== "lookml")
      .map((d: any) => {
        return {
          label: d.title + " - " + d.id,
          value: d.id,
          folder: d.folder.name + " - " + d.folder.id,
        };
      })
      .sortBy(["folder", "label"]) // TODO fix dash sort per folder. currently case sensitive.
      .groupBy("folder")
      .map((value, key) => ({
        label: key,
        options: value,
      })) // 'key' is groups name (folder), 'value' is the array of dashboard value/labels
      .value(); // ok keeping folder in options

    if (DEBUG) {
      console.log("All Dashboards found:");
      console.log(dashboardList);
    }

    return dashboardList;
  };

  onDashSelectChange = (e: any) => {
    this.setState({ selectedDashId: e });

    this.getDash(e);
  };

  handleDashSelectFilter = (term: string) => {
    this.setState({ dashSearchString: term });
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

  // get all active users for owner_id
  getAllUsers = async () => {
    const allUsers = await this.context.core40SDK.ok(
      this.context.core40SDK.all_users({
        fields: "id, display_name, is_disabled",
        sorts: "display_name",
      })
    );

    const usersSelect = chain(allUsers)
      .filter((u: any) => !u.is_disabled)
      .map((u: any) => {
        return {
          value: u.id.toString(),
          label: u.display_name.concat(" - ", u.id.toString()),
        };
      })
      .sortBy(["label"])
      .value();

    if (DEBUG) {
      console.log("All users retrieved:");
      console.log(usersSelect);
    }

    return usersSelect;
  };

  /////////////////////////////////////////////////////

  ////////////////////// LOGGER ///////////////////////

  toggleLog = () => {
    this.setState({ toggleLog: !this.state.toggleLog });
  };

  // toggleLog = async () => {
  //   return new Promise((resolve) => {
  //     this.setState({ toggleLog: !this.state.toggleLog }, resolve);
  //   });
  // };

  clearLog = () => {
    this.setState({ logMessages: [] });
  };

  // use await if logging right after setting state
  log = async (entry: string) => {
    return new Promise((resolve: any) => {
      this.setState(
        { logMessages: this.state.logMessages.concat(entry) },
        resolve
      );
    });
  };

  logWidth = () => {
    const lineLengths = this.state.logMessages.map((line) => line.length);
    return Math.max(...lineLengths);
  };

  ///////////////////////////////////////////////

  //////////////// GENERATE PLANS ////////////////

  // generate plans from Looker query slug
  handleGeneratePlansSubmit = async (
    querySlug: string,
    ownerID: string,
    scheduleName: string,
    scheduleCron: string
  ) => {
    this.setState({
      runningUpdate: true,
      errorMessage: undefined,
      notificationMessage: undefined,
    });

    try {
      await this.log("Params supplied from Generate Plans form:");
      await this.log(
        JSON.stringify({
          querySlug: querySlug,
          ownerID: ownerID,
          scheduleName: scheduleName,
          scheduleCron: scheduleCron,
        })
      );

      const query = await this.context.core40SDK.ok(
        this.context.core40SDK.query_for_slug(querySlug)
      );

      const results: any = await this.context.core40SDK.ok(
        this.context.core40SDK.run_query({
          result_format: "json_detail",
          query_id: query.id!,
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
        console.log(`Query ${querySlug} results:`);
        console.table(results.data);
      }

      await this.log(`Field Mapper based on query: ${querySlug}`);
      await this.log(JSON.stringify(fieldMapper));

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

        newRow.owner_id = ownerID;
        newRow.name = scheduleName;
        newRow.crontab = scheduleCron;

        if (fieldMapper["Email"] !== undefined) {
          newRow.recipients = [results.data[i][fieldMapper["Email"]].value];
        }

        const filtersAdded = Object.fromEntries(
          Object.entries(newRow).filter(([k, v]) => !KEY_FIELDS.includes(k))
        );

        await this.log(
          `Plan generated to destination ${
            newRow.recipients
          } with filters: ${JSON.stringify(filtersAdded)}`
        );

        newArray.push(newRow);
      }

      await this.log("Action Complete");
      this.setState({
        schedulesArray: newArray,
        runningUpdate: false,
        notificationMessage: "Plans successfully generated.",
      });
    } catch (error) {
      this.setState({
        runningUpdate: false,
        errorMessage: `Error generating plans: ${error}`,
      });
    }

    return;
  };

  /////////////////////////////////////////////////////

  ///////////////// GLOBAL FUNCTIONS //////////////////

  // Change schedule ownership from list of users to new user
  GlobalReassignOwnership = async (
    UserMapFrom: string[],
    UserMapTo: string
  ) => {
    this.setState({
      runningUpdate: true,
      errorMessage: undefined,
      notificationMessage: undefined,
    });

    try {
      const allSchedules = await this.context.core40SDK.ok(
        this.context.core40SDK.all_scheduled_plans({
          all_users: true,
        })
      );
      const schedulesToUpdate = allSchedules
        .filter((s) => UserMapFrom.includes(s.user_id!))
        .map((s) => {
          s.user_id = UserMapTo;
          return s;
        });

      const scheduleIds = String(schedulesToUpdate.map((s) => s.id));
      await this.log(
        `Schedules to update from users: ${UserMapFrom} to user: ${UserMapTo}`
      );
      await this.log(`Schedule Plans to update: ${scheduleIds}`);

      if (scheduleIds.length === 0) {
        this.setState({
          runningUpdate: false,
          notificationMessage: `No update. User ${UserMapFrom} has no schedules to reassign.`,
        });
        await this.log("Action Complete");
        return;
      }

      await Promise.all(
        schedulesToUpdate.map(async (s: IScheduledPlan) => {
          try {
            const response = await this.context.core40SDK.ok(
              this.context.core40SDK.update_scheduled_plan(s.id!, s)
            );
            await this.log(
              `Schedule reassigned to user ${UserMapTo} for schedule plan: ${response.id}`
            );
          } catch (error) {
            // generally this is because run_as_recipiant is enabled and email is not a Looker account, will return 422
            await this.log(
              `ERROR: schedule ${s.id}: Unable to reassign to user ${UserMapTo}. Message: '${error.message}'`
            );
          }
        })
      ).then((values) => {
        this.log("Action Complete");
        this.setState({
          runningUpdate: false,
          notificationMessage: `Schedules reassigned to user ${UserMapTo}`,
        });
      });
    } catch (error) {
      this.setState({
        runningUpdate: false,
        errorMessage: `Error reassigning ownership for schedules: ${error}`,
      });
    }
  };

  // Find and replace emails in all schedule plans based on email CSV mapping
  GlobalFindReplaceEmail = async (EmailMap: string) => {
    this.setState({
      runningUpdate: true,
      errorMessage: undefined,
      notificationMessage: undefined,
    });

    try {
      const allSchedules = await this.context.core40SDK.ok(
        this.context.core40SDK.all_scheduled_plans({
          all_users: true,
        })
      );

      const rawData = Papa.parse(EmailMap).data;
      const cleanData = rawData.map((arr: any) =>
        arr.map((el: string) => el.trim().toLowerCase()).filter(Boolean)
      );
      const mappings: Map<string, string> = new Map(cleanData);
      const emailsToChange = Array.from(mappings.keys());

      if (DEBUG) {
        console.log("CSV of email addresses:");
        console.log(mappings);

        console.log("Original Schedules (All):");
        console.log(allSchedules);
      }

      const emailSchedules = allSchedules
        // filter on schedules that contain any matches to emailsToChange
        .filter((s: IScheduledPlan) => {
          const recipients = s.scheduled_plan_destination!.map((a: any) =>
            a.address.toLowerCase()
          );
          return recipients.some((email) => emailsToChange.includes(email));
        })
        .map((s: IScheduledPlan) => {
          // update address with mappings value
          s.scheduled_plan_destination!.map((spd) => {
            const spdEmail = spd.address!.toLowerCase();
            spd.address =
              mappings.get(spdEmail) !== undefined
                ? mappings.get(spdEmail)
                : spd.address;
            return spd;
          });
          return s;
        });

      if (emailSchedules.length === 0) {
        this.setState({
          runningUpdate: false,
          errorMessage: undefined,
          notificationMessage:
            "No update. There were no matches to the CSV email mapping.",
        });
        return;
      }

      const scheduleIds = emailSchedules.map((s: IScheduledPlan) => s.id);
      await this.log(
        `Updating destinations for scheduled plans: ${scheduleIds}`
      );

      await Promise.all(
        emailSchedules.map(async (s: IScheduledPlan) => {
          const newDestinations = String(
            s.scheduled_plan_destination!.map((a: any) => a.address)
          );

          try {
            const response = await this.context.core40SDK.ok(
              this.context.core40SDK.update_scheduled_plan(s.id!, s)
            );
            await this.log(
              `Schedule destinations updated to [${newDestinations}] for schedule plan: ${response.id}`
            );
          } catch (error) {
            // generally this is because run_as_recipiant is enabled and email is not a Looker account, will return 422
            await this.log(
              `ERROR: schedule ${s.id}: Unable to update to [${newDestinations}]. Message: '${error.message}'`
            );
          }
        })
      ).then((values) => {
        this.log("Action Complete");
        this.setState({
          runningUpdate: false,
          notificationMessage: `Update email destinations complete`,
        });
      });
    } catch (error) {
      this.setState({
        runningUpdate: false,
        errorMessage: `Error updating emails: ${error}`,
      });
    }
  };

  // Validate all recent schedules jobs and returns any failures
  GlobalValidateRecentSchedules = async (timeframe: string) => {
    // get the max job ID for each schedule plan
    const maxJobQuery = await this.context.core40SDK.ok(
      this.context.core40SDK.create_query({
        model: "system__activity",
        view: "scheduled_plan",
        fields: ["scheduled_plan.id", "scheduled_job.name", "max_job_id"],
        filters: {
          "scheduled_job.run_once": "No",
          "scheduled_job.finalized_time": "NOT NULL",
        },
        sorts: ["max_job_id desc"],
        limit: "5000",
        dynamic_fields:
          '[{"measure":"max_job_id","based_on":"scheduled_job.id","type":"max"}]',
      })
    );

    const maxJobResults = await this.context.core40SDK.ok(
      this.context.core40SDK.run_query({
        query_id: maxJobQuery.id!,
        result_format: "json",
        cache: false,
      })
    );

    const jobIds = JSON.parse(JSON.stringify(maxJobResults))
      .map((row: any) => row.max_job_id)
      .toString();

    // get information on all recent failures filtered on job IDs, failure, in the past N timeframe
    const latestFailuresQuery = await this.context.core40SDK.ok(
      this.context.core40SDK.create_query({
        model: "system__activity",
        view: "scheduled_plan",
        fields: [
          "scheduled_plan.id",
          "scheduled_job.name",
          "scheduled_job.id",
          "scheduled_job.finalized_time",
          "user.name",
          "scheduled_job.status_detail",
          "scheduled_plan.content_type_id",
          "scheduled_plan.destination_addresses",
        ],
        filters: {
          "scheduled_job.id": jobIds,
          "scheduled_job.status": "failure",
          "scheduled_job.finalized_time": timeframe,
        },
        sorts: ["scheduled_job.id desc"],
        limit: "5000",
      })
    );

    const latestFailuresResults = await this.context.core40SDK.ok(
      this.context.core40SDK.run_query({
        query_id: latestFailuresQuery.id!,
        result_format: "json",
        cache: false,
      })
    );

    if (DEBUG) {
      console.log("Latest Scheduled Jobs Failures:");
      console.log(latestFailuresResults);
    }

    return latestFailuresResults;
  };

  // Resends any failures based on results from GlobalValidateRecentSchedules
  GlobalResendRecentFailures = async (selections: string[]) => {
    this.setState({
      runningUpdate: true,
      errorMessage: undefined,
      notificationMessage: undefined,
    });

    try {
      await this.log(
        `Resending failed jobs for scheduled plans: ${selections}`
      );

      // endpoint is rate limited to 10 calls per second so delaying 200ms between run once calls
      const delay = (i: number) => new Promise((r) => setTimeout(r, i));

      for (let i = 0; i < selections.length; i++) {
        try {
          await delay(200);
          const response = await this.context.core40SDK.ok(
            this.context.core40SDK.scheduled_plan_run_once_by_id(selections[i])
          );
          await this.log(`Resent schedule for schedule plan: ${response.id}`);
        } catch (error) {
          await this.log(
            `ERROR: schedule ${selections[i]}: Unable to resend. Message: '${error.message}'`
          );
        }
      }

      await this.log("Action Complete");
      this.setState({
        runningUpdate: false,
        notificationMessage: "Schedules have been resent",
      });
    } catch (error) {
      this.setState({
        runningUpdate: false,
        errorMessage: `Error resending schedules: ${error}`,
      });
    }
  };

  // Get scheduled plans by System Activity Query ID
  GlobalSelectByQuery = async (querySlug: string) => {
    let saResults: any;
    try {
      const saQuery = await this.context.core40SDK.ok(
        this.context.core40SDK.query_for_slug(querySlug)
      );

      saResults = await this.context.core40SDK.ok(
        this.context.core40SDK.run_query({
          result_format: "json",
          query_id: saQuery.id!,
        })
      );
    } catch (error) {
      this.setState({
        errorMessage: `Error with query slug: ${error}`,
      });
      return [];
    }

    const planIds = JSON.parse(JSON.stringify(saResults))
      .map((row: any) => row["scheduled_plan.id"])
      .toString();

    if (!/\d/.test(planIds)) {
      this.setState({
        errorMessage: `Error retrieving schedule plan IDs from query. Field scheduled_plan.id is not in query`,
      });
      return [];
    }

    // get metadata on scheduled plans
    const scheduledPlansQuery = await this.context.core40SDK.ok(
      this.context.core40SDK.create_query({
        model: "system__activity",
        view: "scheduled_plan",
        fields: [
          "scheduled_plan.id",
          "scheduled_plan.name",
          "scheduled_plan.enabled",
          "scheduled_plan.run_once",
          "scheduled_times",
          "summary",
          "user.name",
          "scheduled_plan.content_type_id",
          "scheduled_plan.destination_addresses",
        ],
        filters: {
          "scheduled_plan.id": planIds, // supplying dup IDs in filter is OK
        },
        sorts: ["scheduled_plan.name asc"],
        limit: "5000",
        dynamic_fields:
          '[{"dimension":"scheduled_times","expression":"if(is_null(${scheduled_plan.cron_schedule}),${scheduled_plan.datagroup},${scheduled_plan.cron_schedule})"}, {"dimension":"summary","expression":"concat(${scheduled_plan_destination.format},\\" via \\",${scheduled_plan_destination.type})"}]',
      })
    );

    const scheduledPlansResults = await this.context.core40SDK.ok(
      this.context.core40SDK.run_query({
        query_id: scheduledPlansQuery.id!,
        result_format: "json",
        cache: false,
      })
    );

    const cleanResults = JSON.parse(JSON.stringify(scheduledPlansResults)).map(
      (row: any) => {
        row["scheduled_times"] =
          validationTypeCron(row["scheduled_times"]) == "error"
            ? row["scheduled_times"]
            : translateCron(row["scheduled_times"]);
        return row;
      }
    );

    if (DEBUG) {
      console.log("Scheduled Plans Results:");
      console.table(cleanResults);
    }

    return cleanResults;
  };

  GlobalSelectByQueryRun = async (
    scheduledPlansData: string[],
    action: string
  ) => {
    this.setState({
      runningUpdate: true,
      errorMessage: undefined,
      notificationMessage: undefined,
    });

    await this.log(
      `Running action '${action}' for scheduled plans: ${scheduledPlansData}`
    );

    switch (action) {
      case "enable":
      case "disable":
        for (let i = 0; i < scheduledPlansData.length; i++) {
          const plan = await this.context.core40SDK.ok(
            this.context.core40SDK.scheduled_plan(scheduledPlansData[i])
          );

          action === "enable" ? (plan.enabled = true) : (plan.enabled = false);

          try {
            const response = await this.context.core40SDK.ok(
              this.context.core40SDK.update_scheduled_plan(
                scheduledPlansData[i],
                plan
              )
            );
            await this.log(
              `${action[0].toUpperCase()}${action.slice(1)}d schedule plan: ${
                response.id
              }`
            );
          } catch (error) {
            await this.log(
              `ERROR: schedule ${scheduledPlansData[i]}: Unable to ${action}. Message: '${error.message}'`
            );
          }
        }
        break;

      case "run once":
        const delay = (i: number) => new Promise((r) => setTimeout(r, i)); // endpoint is rate limited to 10 calls per second so delaying 200ms between run once calls

        for (let i = 0; i < scheduledPlansData.length; i++) {
          await delay(200);

          try {
            const response = await this.context.core40SDK.ok(
              this.context.core40SDK.scheduled_plan_run_once_by_id(
                scheduledPlansData[i]
              )
            );
            await this.log(`Resent schedule for schedule plan: ${response.id}`);
          } catch (error) {
            await this.log(
              `ERROR: schedule ${scheduledPlansData[i]}: Unable to resend. Message: '${error.message}'`
            );
          }
        }
        break;

      case "delete":
        for (let i = 0; i < scheduledPlansData.length; i++) {
          try {
            const response = await this.context.core40SDK.ok(
              this.context.core40SDK.delete_scheduled_plan(
                scheduledPlansData[i]
              )
            );
            await this.log(`Deleted schedule plan: ${scheduledPlansData[i]}`);
          } catch (error) {
            await this.log(
              `ERROR: schedule ${scheduledPlansData[i]}: Unable to delete. Message: '${error.message}'`
            );
          }
        }
        break;
    }

    await this.log("Action Complete");
    this.setState({
      runningUpdate: false,
      notificationMessage: `Select by query action ${action} complete`,
    });
    return;
  };

  /////////////////////////////////////////////////////////////////////

  ///////////////// DASHBOARD SEARCH AND PREP FOR TABLE ////////////////

  runningMessage = (message: string): JSX.Element => {
    return (
      <Flex>
        <FlexItem>
          <Text
            color="neutral"
            fontWeight="semiBold"
            mr="large"
            textAlign="center"
          >
            {message}
          </Text>
        </FlexItem>
        <FlexItem alignSelf="center">
          <Spinner size={20} />
        </FlexItem>
      </Flex>
    );
  };

  getDash = async (dash_id: string) => {
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
        this.context.core40SDK.dashboard(dash_id)
      );
      const schedulesArray = await this.getScheduledPlans(dash_id, dash);

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
        errorMessage: `Unable to load Dashboard: ${error}`,
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
      created_at: this.formatDate(s.created_at!),
      updated_at: this.formatDate(s.updated_at!),
      next_run_at: this.formatDate(s.next_run_at!),
      last_run_at: this.formatDate(s.last_run_at!),
    };

    formattedRow.name = s.name;
    formattedRow.timezone = s.timezone;
    formattedRow.include_links = s.include_links;

    formattedRow.owner_id = s.user.id!.toString(); // change from number to string for better compatability with Select
    formattedRow.crontab = s.crontab === null ? "" : s.crontab;
    formattedRow.datagroup = s.datagroup === null ? "" : s.datagroup;
    formattedRow.run_as_recipient =
      s.run_as_recipient === null ? false : s.run_as_recipient;
    formattedRow.long_tables = s.long_tables === null ? false : s.long_tables;
    formattedRow.pdf_landscape =
      s.pdf_landscape === null ? false : s.pdf_landscape;
    formattedRow.pdf_paper_size =
      s.pdf_paper_size === null ? "" : s.pdf_paper_size;
    formattedRow.recipients = s.scheduled_plan_destination.map(
      (a: any) => a.address
    );

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
  getScheduledPlans = async (dash_id: string, dash: IDashboard) => {
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
  openExploreDrillWindow = (scheduledPlanID: number): void => {
    const url = `/explore/system__activity/scheduled_plan?fields=scheduled_job.created_time,scheduled_job.finalized_time,scheduled_job.name,dashboard.title,user.name,scheduled_job.status,scheduled_job.status_detail,scheduled_plan.destination_addresses,scheduled_plan_destination.type,scheduled_plan_destination.format&f[scheduled_plan.id]=${scheduledPlanID}&sorts=scheduled_job.finalized_time+desc&limit=500`;
    this.context.extensionSDK.openBrowserWindow(url, "_blank");
  };

  // open window to Scheduled Plan System Activity Explore
  openExploreWindow = (): void => {
    this.context.extensionSDK.openBrowserWindow(
      "/explore/system__activity/scheduled_plan",
      "_blank"
    );
  };

  // parse string for commas and create array of destiations
  writeScheduledPlanDestinations = (schedule: IScheduledPlanTable): any => {
    const scheduledPlanDestinations: any = [];
    schedule.recipients.forEach((email) => {
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
      if (REQUIRED_FIELDS.includes(key)) {
        if (key === "recipients") {
          if (value.length === 0) return false;
        }
        if (value === "") return false;
      }
    }

    // 1 trigger field must be filled out
    const triggers = [
      row[REQUIRED_TRIGGER_FIELDS[0]],
      row[REQUIRED_TRIGGER_FIELDS[1]],
    ];
    if (
      triggers.reduce(
        (acc: number, field: string) => acc + (field.length > 0 ? 1 : 0),
        0
      ) !== 1
    ) {
      return false;
    }

    return true;
  };

  // sets default values for rows
  setDefaultRowParams = (row: any) => {
    row.recipients = [];
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
      ...(rowDetails.datagroup !== "" && {
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
    try {
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
      await this.log(
        `Schedule ${newSchedule.name} created with schedule plan ID: ${response.id}`
      );

      return response;
    } catch (error) {
      await this.log(
        `ERROR: schedule ${newSchedule.name}: Unable to create. Message: '${error.message}'`
      );
    }
  };

  // update schedule with new data in table
  updateSchedule = async (currentSchedule: any, storedSchedule: any) => {
    if (isEqual(currentSchedule, storedSchedule)) {
      await this.log(
        `No update for schedule id: ${currentSchedule.details.id}`
      );
      return;
    }

    try {
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
      await this.log(
        `Schedule ${currentSchedule.name} updated. Schedule plan ID: ${response.id}`
      );
      return response;
    } catch (error) {
      await this.log(
        `ERROR: schedule ${currentSchedule.name}: Unable to update. Message: '${error.message}'`
      );
    }
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
    this.setState({
      runningUpdate: true,
      errorMessage: undefined,
      notificationMessage: undefined,
    });

    await this.log(`Deleting rows from table`);

    const newArray = cloneDeep(this.state.schedulesArray);
    for (let i = 0; i < rows.length; i++) {
      const rowIndex = rows[i].rowIndex;
      const scheduleId = rows[i].scheduleId;
      if (scheduleId !== undefined) {
        try {
          const response = await this.context.core40SDK.ok(
            this.context.core40SDK.delete_scheduled_plan(scheduleId)
          );

          await this.log(`Deleted schedule plan: ${scheduleId}`);
        } catch (error) {
          await this.log(
            `ERROR: schedule ${scheduleId}: Unable to delete. Message: '${error.message}'`
          );
        }
      } else {
        await this.log(
          `Deleted row (no schedule plan): ${Number(rowIndex) + 1}`
        );
      }

      newArray.splice(rowIndex, 1);
    }

    await this.log("Action Complete");
    this.setState({
      runningUpdate: false,
      notificationMessage: "Row(s) Deleted",
    });

    // if no more rows, recreate table
    if (newArray.length === 0) {
      const scheduleHeader = await this.prepareEmptyTable(
        this.state.currentDash!
      );

      if (DEBUG) {
        console.log("All rows have been deleted. Preparing empty table:");
        console.log(scheduleHeader[0]);
      }

      this.setState({
        schedulesArray: scheduleHeader,
        schedulesArrayBackup: scheduleHeader,
      });
      return;
    }

    this.setState({
      schedulesArray: newArray,
      schedulesArrayBackup: newArray,
    });
  };

  // create/update schedule - updates scheduled_plan or creates new if it doesn't exist
  updateRow = async (rowIndex: number[], schedulesToAdd: any[]) => {
    this.setState({
      runningUpdate: true,
      errorMessage: undefined,
      notificationMessage: undefined,
    });

    const updateTable = cloneDeep(this.state.schedulesArray);

    try {
      const schedulesToCheck = await this.getScheduledPlans(
        this.state.selectedDashId,
        this.state.currentDash!
      );

      // ensure all key fields are filled out
      if (
        !schedulesToAdd.reduce(
          (acc: boolean, row: any) => acc && this.validateRow(row),
          true
        )
      ) {
        this.setState({
          toggleLog: false,
          errorMessage:
            "Required fields missing. Ensure all fields have values: " +
            REQUIRED_FIELDS.join(", ") +
            ", " +
            REQUIRED_TRIGGER_FIELDS.join(" or "),
          runningUpdate: false,
        });
        return;
      }

      // todo validate cron, owner_id, recipients

      await this.log(`Creating and updating rows`);

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
        ).then((response) => {
          if (response !== undefined) {
            const responseJson: IScheduledPlanTable = JSON.parse(
              JSON.stringify(response)
            );
            updateTable[rowIndex[i]] = this.assignRowValues(responseJson);
          }
        });
      }

      await this.log("Action Complete");
      this.setState({
        schedulesArray: updateTable,
        schedulesArrayBackup: updateTable,
        runningUpdate: false,
        notificationMessage: "Row(s) Created and Updated",
      });
    } catch (error) {
      await this.log("FATAL: unhandled exception while running action");
      this.setState({
        runningUpdate: false,
        errorMessage: `Error updating schedules: ${error}`,
      });
    }
  };

  // run once - send 1:all rows to scheduled_plan_run_once
  testRow = async (rowIndex: number[], schedulesToTest: any[]) => {
    this.setState({
      runningUpdate: true,
      errorMessage: undefined,
      notificationMessage: undefined,
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
          toggleLog: false,
          errorMessage:
            "Required fields missing. Ensure all fields have values: " +
            REQUIRED_FIELDS.join(", ") +
            ", " +
            REQUIRED_TRIGGER_FIELDS.join(" or "),
          runningUpdate: false,
        });
        return;
      }

      // todo validate cron, owner_id, recipients

      await this.log("Running and sending schedules plans");

      // endpoint is rate limited to 10 calls per second so delaying 200ms between run once calls
      const delay = (i: number) => new Promise((r) => setTimeout(r, i));

      for (let i = 0; i < schedulesToTest.length; i++) {
        try {
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

          await this.log(`Resent schedule for schedule plan: ${response.id}`);
        } catch (error) {
          await this.log(
            `ERROR: schedule ${schedulesToTest[i].name}: Unable to resend. Message: '${error.message}'`
          );
        }
      }

      await this.log("Action Complete");
      this.setState({
        runningUpdate: false,
        notificationMessage: "Schedule(s) Sent",
      });
    } catch (error) {
      await this.log("FATAL: unhandled exception while running action");
      this.setState({
        runningUpdate: false,
        errorMessage: `Error sending schedules: ${error}`,
      });
    }
  };

  // disabling 1:all rows
  disableRow = async (rowIndex: number[], schedulesToDisable: any[]) => {
    this.setState({
      runningUpdate: true,
      errorMessage: undefined,
      notificationMessage: undefined,
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
          toggleLog: false,
          errorMessage: "Cannot disable schedule(s) that are not created.",
          runningUpdate: false,
        });
        return;
      }

      await this.log("Disabling rows");

      const updateTable = cloneDeep(this.state.schedulesArray);

      for (let i = 0; i < schedulesToDisable.length; i++) {
        try {
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

          await this.log(`Disabled schedule plan: ${response.id}`);
        } catch (error) {
          await this.log(
            `ERROR: schedule ${schedulesToDisable[i].name}: Unable to disable. Message: '${error.message}'`
          );
        }
      }

      await this.log("Action Complete");
      this.setState({
        schedulesArray: updateTable,
        schedulesArrayBackup: updateTable,
        runningUpdate: false,
        notificationMessage: "Schedule(s) have been disabled",
      });
    } catch (error) {
      await this.log("FATAL: unhandled exception while running action");
      this.setState({
        runningUpdate: false,
        errorMessage: `Error disabling schedules: ${error}`,
      });
    }
  };

  // enable 1:all rows
  enableRow = async (rowIndex: number[], schedulesToEnable: any[]) => {
    this.setState({
      runningUpdate: true,
      errorMessage: undefined,
      notificationMessage: undefined,
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
          toggleLog: false,
          errorMessage: "Cannot enable schedule(s) that are not created.",
          runningUpdate: false,
        });
        return;
      }

      await this.log("Enabling rows");

      const updateTable = cloneDeep(this.state.schedulesArray);

      for (let i = 0; i < schedulesToEnable.length; i++) {
        try {
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

          await this.log(`Enabling schedule plan: ${response.id}`);
        } catch (error) {
          await this.log(
            `ERROR: schedule ${schedulesToEnable[i].name}: Unable to enable. Message: '${error.message}'`
          );
        }
      }

      await this.log("Action Complete");
      this.setState({
        schedulesArray: updateTable,
        schedulesArrayBackup: updateTable,
        runningUpdate: false,
        notificationMessage: "Schedule(s) have been enabled",
      });
    } catch (error) {
      await this.log("FATAL: unhandled exception while running action");
      this.setState({
        runningUpdate: false,
        errorMessage: `Error enabling schedules: ${error}`,
      });
    }
  };

  render() {
    return (
      <>
        {this.state.errorMessage && (
          <MessageBar
            intent="critical"
            onPrimaryClick={() => {
              this.setState({
                errorMessage: undefined,
              });
            }}
          >
            {this.state.errorMessage}
          </MessageBar>
        )}

        <Box m="large">
          <Flex height="50px" flexWrap="nowrap" justifyContent="space-between">
            <FlexItem>
              <Flex alignItems="center">
                <FlexItem>
                  <Text variant="secondary">Select A Dashboard: </Text>
                </FlexItem>
                <FlexItem mx="medium">
                  <Select
                    options={newGroupOptions(
                      this.state.dashSearchString,
                      this.state.dashboards
                    )}
                    onChange={this.onDashSelectChange}
                    onFilter={this.handleDashSelectFilter}
                    value={this.state.selectedDashId}
                    isFilterable
                    autoResize
                    minWidth="160"
                    maxWidth="320"
                  />
                </FlexItem>
              </Flex>
            </FlexItem>

            <FlexItem>
              {this.state.runningQuery &&
                this.runningMessage("Getting Schedules Data ...")}

              {this.state.runningUpdate &&
                this.runningMessage("Processing ...")}

              {this.state.notificationMessage && (
                <MessageBar
                  intent="positive"
                  onPrimaryClick={() => {
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
              <Flex flexWrap="nowrap">
                {this.state.schedulesArray.length > 0 && (
                  <>
                    <FlexItem mx="xxxsmall">
                      <GeneratePlans
                        users={this.state.users}
                        toggleLog={this.toggleLog}
                        handleGeneratePlansSubmit={
                          this.handleGeneratePlansSubmit
                        }
                      />
                    </FlexItem>
                    <FlexItem mx="xxxsmall">
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
                          <ButtonOutline color="critical" onClick={open}>
                            Revert
                          </ButtonOutline>
                        )}
                      </Confirm>
                    </FlexItem>
                  </>
                )}

                {/* GlobalActions */}
                <FlexItem mx="xxxsmall">
                  <GlobalActions
                    users={this.state.users}
                    toggleLog={this.toggleLog}
                    openExploreWindow={this.openExploreWindow}
                    GlobalReassignOwnership={this.GlobalReassignOwnership}
                    GlobalFindReplaceEmail={this.GlobalFindReplaceEmail}
                    GlobalValidateRecentSchedules={
                      this.GlobalValidateRecentSchedules
                    }
                    GlobalResendRecentFailures={this.GlobalResendRecentFailures}
                    GlobalSelectByQuery={this.GlobalSelectByQuery}
                    GlobalSelectByQueryRun={this.GlobalSelectByQueryRun}
                  />
                </FlexItem>

                {/* Logger */}
                <FlexItem>
                  <>
                    <Dialog
                      isOpen={this.state.toggleLog}
                      onClose={this.toggleLog}
                      width={`${this.logWidth() * 0.75}em`}
                      maxWidth="80vw"
                    >
                      <ConfirmLayout
                        title="Schedules Log"
                        message={
                          <>
                            <Paragraph mb="small" width="50rem">
                              Execution log:
                            </Paragraph>
                            <MonospaceTextArea
                              readOnly
                              resize
                              height="50vh"
                              value={this.state.logMessages.join("\n")}
                            />
                          </>
                        }
                        primaryButton={
                          this.state.runningUpdate ? (
                            <Button disabled>In Progress</Button>
                          ) : (
                            <Button onClick={this.toggleLog}>Close</Button>
                          )
                        }
                        secondaryButton={
                          <ButtonOutline onClick={this.clearLog}>
                            Clear Log
                          </ButtonOutline>
                        }
                      />
                    </Dialog>
                    <Button color="neutral" onClick={this.toggleLog}>
                      View Log
                    </Button>
                  </>
                </FlexItem>
              </Flex>
            </FlexItem>
          </Flex>

          {this.state.currentDash && (
            <>
              <Flex>
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
              </Flex>
            </>
          )}

          {this.state.dashboards.length === 0 && (
            <Flex justifyContent="center" height="500px">
              <FlexItem alignSelf="center">
                <Spinner color="black" />
              </FlexItem>
            </Flex>
          )}

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
              openExploreDrillWindow={this.openExploreDrillWindow}
              openDashboardWindow={this.openDashboardWindow}
              toggleLog={this.toggleLog}
            />
          </Flex>
        </Box>
      </>
    );
  }
}
