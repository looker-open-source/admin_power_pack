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

import React, { useEffect } from "react";
import {
  IconButton,
  Box,
  Flex,
  InputChips,
  Tree,
  TreeItem,
  TreeGroup,
} from "@looker/components";
// import { IFolder, IScheduledPlan } from "@looker/sdk/lib/sdk/4.0/models";
import { FolderTree, TreeVisProps } from "./constants";

export const TreeVis: React.FunctionComponent<TreeVisProps> = ({
  folderTree,
  groups,
  users,
  getContentMetadataAccessForFolder,
}): JSX.Element => {
  // recursive nested Tree of folder hierarchy
  const NestedTree: React.FunctionComponent<FolderTree> = (
    branch
  ): JSX.Element => {
    // const folderMetadataAccess = getContentMetadataAccessForFolder(
    //   branch.content_metadata_id!
    // );

    console.log(branch);

    const nestedBranches = branch.children!.map((f: FolderTree) => {
      return <NestedTree {...f} key={f.id} />;
    });

    return (
      <>
        {nestedBranches.length === 0 ? (
          <TreeItem
            key={branch.id}
            icon="VisTable"
            // detail={
            //   <>
            //     <Flex>
            //       <InputChips onChange={() => {}} values={["x", "y"]} />
            //       <InputChips onChange={() => {}} values={["z"]} />
            //       <InputChips onChange={() => {}} values={["b", "a"]} />
            //       <InputChips onChange={() => {}} values={["c", "d"]} />
            //     </Flex>
            //   </>
            // }
            // detail={
            //   <IconButton
            //     icon="Gear"
            //     label="Get Info"
            //     onClick={() => alert("You've got info!")}
            //   />
            // }
          >
            {branch.name}
            {JSON.stringify(branch.contentMeta)}
            {JSON.stringify(branch.contentMetaGroupUser)}
          </TreeItem>
        ) : (
          <Tree
            label={branch.name}
            key={branch.id}
            border
            icon="VisTable"
            // detail={
            //   <>
            //     <Flex>
            //       <InputChips onChange={() => {}} values={["x", "y"]} />
            //       <InputChips onChange={() => {}} values={["z"]} />
            //       <InputChips onChange={() => {}} values={["b", "a"]} />
            //       <InputChips onChange={() => {}} values={["c", "d"]} />
            //     </Flex>
            //   </>
            // }
          >
            {nestedBranches}
          </Tree>
        )}
      </>
    );
  };

  return (
    <Box>
      <TreeGroup label="Folders">
        <NestedTree {...folderTree!} />
      </TreeGroup>
    </Box>
  );
};
