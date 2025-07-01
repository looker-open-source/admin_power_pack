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

import React, { useState, useEffect, useCallback } from "react";
import { Select, FlexItem, Text } from "@looker/components";
import { ExtensionContext } from "@looker/extension-sdk-react";
import { chain } from "lodash";
import { GroupSelectOption } from "./constants";

interface SchedulePageDashboardSelectProps {
  selectedDashId: string;
  onDashSelectChange: (dashId: string) => void;
}

export const SchedulePageDashboardSelect: React.FC<
  SchedulePageDashboardSelectProps
> = ({ selectedDashId, onDashSelectChange }) => {
  const [dashboards, setDashboards] = useState<GroupSelectOption[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const context = React.useContext(ExtensionContext);

  // Search dashboards function
  const searchDashboards = useCallback(
    async (search: string) => {
      if (!context.core40SDK) return [];

      try {
        const searchParams: any = {
          fields: "id,title,folder(id,name)",
          sorts: "title",
          limit: 100,
          offset: 0,
        };

        // Only add title filter if there's a search term
        if (search && search.length > 0) {
          searchParams.title = `%${search.replace(/\s/g, "%").toLowerCase()}%`;
        }

        const dashboards: any = await context.core40SDK.ok(
          context.core40SDK.search_dashboards(searchParams)
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
          .sortBy(["folder", "label"])
          .groupBy("folder")
          .map((value, key) => ({
            label: key,
            options: value,
          }))
          .value();

        return dashboardList;
      } catch (err) {
        console.error("Error searching dashboards:", err);
        throw err;
      }
    },
    [context.core40SDK]
  );

  // Load initial dashboards
  useEffect(() => {
    const loadInitialDashboards = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const initialDashboards = await searchDashboards("");
        setDashboards(initialDashboards);
      } catch (err) {
        setError("Failed to load dashboards");
        console.error("Error loading initial dashboards:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (context.core40SDK) {
      loadInitialDashboards();
    }
  }, [context.core40SDK, searchDashboards]);

  // Handle search term changes with debouncing
  useEffect(() => {
    if (!context.core40SDK) return;

    const timeoutId = setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const searchResults = await searchDashboards(searchTerm);
        setDashboards(searchResults);
      } catch (err) {
        setError("Failed to search dashboards");
        console.error("Error searching dashboards:", err);
      } finally {
        setIsLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchTerm, context.core40SDK, searchDashboards]);

  // Handle filter input
  const handleFilter = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  // Handle dashboard selection
  const handleChange = useCallback(
    (dashId: string) => {
      onDashSelectChange(dashId);
    },
    [onDashSelectChange]
  );

  if (error) {
    return (
      <FlexItem>
        <Text color="critical">Error: {error}</Text>
      </FlexItem>
    );
  }

  return (
    <FlexItem>
      <Select
        options={dashboards}
        onChange={handleChange}
        onFilter={handleFilter}
        value={selectedDashId}
        isFilterable
        autoResize
        minWidth="240px"
        maxWidth="480px"
        placeholder={
          isLoading ? "Loading dashboards..." : "Select a dashboard..."
        }
      />
    </FlexItem>
  );
};
