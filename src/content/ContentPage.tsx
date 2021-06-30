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

import React from "react";
import { RouteComponentProps } from "react-router-dom";
import { ExtensionContext } from "@looker/extension-sdk-react";
import { TreeVis } from "./TreeVis";
import { ContentState, FolderTree } from "./constants";
import { newOptions } from "../shared/helper";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { Flex, FlexItem, Select, Text } from "@looker/components";
import { IFolder, IUser, IGroup } from "@looker/sdk/lib/sdk/4.0/models";
import asyncPool from "tiny-async-pool";

export class ContentPage extends React.Component<
  RouteComponentProps,
  ContentState
> {
  static contextType = ExtensionContext;
  context!: React.ContextType<typeof ExtensionContext>;

  constructor(props: RouteComponentProps) {
    super(props);
    this.state = {
      // notificationMessage: "",
      selectedFolderId: "",
      folderSearchString: "",
      foldersSelectOptions: [],
      totalChildCount: 0,
      childLoadComplete: 0,
      folderTree: undefined,
      folders: undefined,
      groups: undefined,
      users: undefined,
    };
  }

  //////////////// RUN ON PAGE LOAD ////////////////
  componentDidMount = async () => {
    // this.setState({
    //   notificationMessage: "Retrieving all folders...",
    // });

    try {
      const [f, groups, users] = await Promise.all([
        this.getAllFolders(),
        this.getAllGroups(),
        this.getAllUsers(),
      ]);

      console.log(f);
      console.log(groups);
      console.log(users);

      this.setState({
        folders: f.folders,
        foldersSelectOptions: f.foldersSelectOptions,
        groups: groups,
        users: users,
        // notificationMessage: "Retrieving all dashboards...Done",
      });
    } catch (error) {
      // this.setState({
      //   errorMessage: `Unable to load Dashboards: ${error}`,
      //   runningQuery: false,
      //   notificationMessage: undefined,
      // });
      // return;
    }
  };

  onFolderSelectChange = async (folderId: string) => {
    const totalChildCount = this.getTotalChildCount(folderId, 0);
    console.log(`Total child count = ${totalChildCount}`);
    this.setState(
      {
        selectedFolderId: folderId,
        totalChildCount: totalChildCount,
      },
      async () => {
        let folderTree = this.state.folders!.filter(
          (f) => f.id === folderId
        )[0];
        folderTree = await this.buildTreeData(folderTree);
        this.setState({ folderTree: folderTree, childLoadComplete: 0 });
      }
    );
  };

  handleFolderSelectFilter = (term: string) => {
    this.setState({ folderSearchString: term });
  };

  // get all folders and return folder data for selection
  getAllFolders = async () => {
    const folders = await this.context.core40SDK
      .ok(
        this.context.core40SDK.all_folders(
          "id,name,parent_id,content_metadata_id,child_count"
        )
      )
      .then((results) => {
        return results.filter((f) => f.id !== "lookml");
      });

    const foldersSelectOptions = folders
      .sort((a, b) => {
        const nameA = a.name.toUpperCase();
        const nameB = b.name.toUpperCase();
        return nameA < nameB ? -1 : 1;
      })
      .map((f) => {
        return { label: f.name + " - " + f.id, value: f.id! };
      });

    return { folders: folders, foldersSelectOptions: foldersSelectOptions };
  };

  // recursively count total number of children folders from selected folder. used to show progress loading bar
  getTotalChildCount = (folderId: string, count: number) => {
    count += 1;
    this.state
      .folders!.filter((f) => f.parent_id === folderId)
      .map((f) => {
        count = this.getTotalChildCount(f.id!, count);
      });
    return count;
  };

  // recursive function to build nested tree with children
  buildTreeData = async (tree: FolderTree) => {
    tree.children = this.state.folders!.filter((f) => f.parent_id === tree.id);

    // used for progress loading bar
    this.setState({
      childLoadComplete: this.state.childLoadComplete + 1,
    });

    try {
      tree.contentMeta = await this.getContentMetadataForFolder(
        tree.content_metadata_id!
      );
      tree.contentMetaGroupUser = await this.getContentMetadataAccessForFolder(
        tree.content_metadata_id!
      );
    } catch (error) {
      console.log(error);
    } finally {
      // this recursively builds roots of tree with async pool, similar to doing this:
      // tree.children.map((f) => { return this.buildTreeData(f); });
      // but ensuring that only a maxmium of 15 function requests are running at the same time
      if (tree.children.length > 0) {
        // need to batch create promises to avoid hitting timeout issues
        Promise.allSettled(
          await asyncPool(15, tree.children, this.buildTreeData)
        ).then((results) => {
          tree.children = results.map((r: any) => r.value);
        });
      }
    }

    return tree;
  };

  getContentMetadataForFolder = async (folderMetadataId: number) => {
    return await this.context.core40SDK.ok(
      this.context.core40SDK.content_metadata(
        folderMetadataId,
        "parent_id,inherits,inheriting_id"
      )
    );
  };

  getContentMetadataAccessForFolder = async (folderMetadataId: number) => {
    return await this.context.core40SDK.ok(
      this.context.core40SDK.all_content_metadata_accesses(
        folderMetadataId,
        "group_id,user_id,permission_type"
      )
    );
  };

  // get all users with user.id as key
  getAllUsers = async (): Promise<Map<number, IUser>> => {
    const allUsers = await this.context.core40SDK.ok(
      this.context.core40SDK.all_users({
        fields: "id, display_name",
        sorts: "display_name",
      })
    );

    return new Map(allUsers.map((u) => [u.id!, u]));
  };

  // get all groups with group.id as key
  getAllGroups = async (): Promise<Map<number, IGroup>> => {
    const allGroups = await this.context.core40SDK.ok(
      this.context.core40SDK.all_groups({
        fields: "id, name, user_count, externally_managed",
        sorts: "name",
      })
    );

    return new Map(allGroups.map((g) => [g.id!, g]));
  };

  render() {
    return (
      <>
        <Flex alignItems="center">
          <FlexItem>
            <Text variant="secondary">Select Root Folder: </Text>
          </FlexItem>
          <FlexItem mx="medium">
            <Select
              options={newOptions(
                this.state.folderSearchString,
                this.state.foldersSelectOptions
              )}
              onChange={this.onFolderSelectChange}
              onFilter={this.handleFolderSelectFilter}
              value={this.state.selectedFolderId}
              isFilterable
              autoResize
              minWidth="160"
              maxWidth="320"
              // defaultValue="1" // default to shared folder
            />
          </FlexItem>
        </Flex>
        {this.state.childLoadComplete !== 0 && (
          <Flex justifyContent="center">
            <FlexItem width="200px" height="200px">
              <Text>Gathering folder data...</Text>
              <CircularProgressbar
                value={this.state.childLoadComplete}
                maxValue={this.state.totalChildCount}
                text={`${this.state.childLoadComplete} out of ${this.state.totalChildCount} complete`}
                styles={buildStyles({
                  textSize: "8px",
                })}
              />
            </FlexItem>
          </Flex>
        )}

        {this.state.folderTree && (
          <TreeVis
            folderTree={this.state.folderTree}
            groups={this.state.groups}
            users={this.state.users}
            getContentMetadataAccessForFolder={
              this.getContentMetadataAccessForFolder
            }
          />
        )}
      </>
    );
  }
}
