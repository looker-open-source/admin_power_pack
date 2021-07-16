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

import cronstrue from "cronstrue";
import styled from "styled-components";
import { TextArea } from "@looker/components";
import { SelectOption, GroupSelectOption } from "./constants";

export const MonospaceTextArea = styled(TextArea)`
  textarea {
    font-family: monospace;
  }
`;

export const translateCron = (cron: string): string => {
  // console.log(cron);

  if (cron !== "") {
    try {
      // valid cron must have 4 spaces
      const spaceCount = cron.split(" ").length - 1;
      if (spaceCount > 4) {
        return "Not a valid cron expression";
      }

      const expression = cronstrue.toString(cron);
      return expression;
    } catch (error) {
      return "Not a valid cron expression";
    }
  } else {
    return "";
  }
};

// used for validationMessage.type to show in error formatting
export const validationTypeCron = (cron: string): "error" | undefined => {
  const cronExpression = translateCron(cron);

  if (cron !== "" && cronExpression === "Not a valid cron expression") {
    return "error";
  }
  return undefined;
};

// filter generic list - no options[]
export const newOptions = (searchTerm: string, options: SelectOption[]) => {
  if (searchTerm === "") return options;

  return options.filter((o) => {
    return o.label.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1;
  });
};

// filter list with options[] while retain grouping
export const newGroupOptions = (
  searchTerm: string,
  options: GroupSelectOption[]
) => {
  if (searchTerm === "") return options;

  let newOptions: any = [];

  options.filter((group) => {
    const foundOptionsPerGroup = group.options.filter((o) => {
      return o.label.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1;
    });

    if (foundOptionsPerGroup.length > 0) {
      newOptions.push({
        label: group.label,
        options: foundOptionsPerGroup,
      });
    }
  });

  return newOptions;
};
