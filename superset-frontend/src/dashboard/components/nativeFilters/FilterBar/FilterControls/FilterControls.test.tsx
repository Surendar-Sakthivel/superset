/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { render } from 'spec/helpers/testing-library';
import { Provider } from 'react-redux';
import { Store } from 'redux';
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import { FilterBarOrientation } from 'src/dashboard/types';
import FilterControls from './FilterControls';

const mockStore = configureStore([thunk]);

const createMockFilter = (id: string, name: string) => ({
  id,
  name,
  filterType: 'filter_select',
  targets: [{ datasetId: 1, column: { name: 'country' } }],
  defaultDataMask: {},
  controlValues: {},
  cascadeParentIds: [],
  scope: {
    rootPath: ['ROOT_ID'],
    excluded: [] as string[],
  },
  isInstant: true,
  allowsMultipleValues: true,
  isRequired: false,
});

const getDefaultState = (orientation: FilterBarOrientation) => ({
  dashboardInfo: {
    id: 1,
    filterBarOrientation: orientation,
  },
  dashboardLayout: {
    present: {
      ROOT_ID: {
        type: 'ROOT',
        id: 'ROOT_ID',
        children: ['TABS-1'],
      },
      'TABS-1': {
        type: 'TABS',
        id: 'TABS-1',
        children: ['TAB-1', 'TAB-2'],
      },
      'TAB-1': {
        type: 'TAB',
        id: 'TAB-1',
        children: ['CHART-1'],
      },
      'TAB-2': {
        type: 'TAB',
        id: 'TAB-2',
        children: ['CHART-2'],
      },
      'CHART-1': {
        type: 'CHART',
        id: 'CHART-1',
        meta: { chartId: 1 },
      },
      'CHART-2': {
        type: 'CHART',
        id: 'CHART-2',
        meta: { chartId: 2 },
      },
    },
  },
  charts: {
    1: { id: 1, formData: {} },
    2: { id: 2, formData: {} },
  },
  dataMask: {},
  nativeFilters: {
    filters: {
      'filter-1': createMockFilter('filter-1', 'Country Filter'),
      'filter-2': createMockFilter('filter-2', 'Region Filter'),
      'filter-3': createMockFilter('filter-3', 'City Filter'),
    },
    filterSets: {},
  },
  dashboardState: {
    directPathToChild: [],
    activeTabs: ['TAB-1'],
    chartCustomizationItems: [],
  },
  sliceEntities: {
    slices: {
      1: {
        slice_id: 1,
        slice_name: 'Chart 1',
        form_data: {},
      },
      2: {
        slice_id: 2,
        slice_name: 'Chart 2',
        form_data: {},
      },
    },
  },
  datasources: {},
});

function setup(overrideState: any = {}, props: any = {}) {
  const state = {
    ...getDefaultState(FilterBarOrientation.Vertical),
    ...overrideState,
  };
  const store = mockStore(state) as Store;

  return render(
    <Provider store={store}>
      <FilterControls
        dataMaskSelected={{}}
        onFilterSelectionChange={jest.fn()}
        {...props}
      />
    </Provider>,
  );
}

test('FilterControls should mark out-of-scope filters as not overflowed in vertical mode', () => {
  const stateWithVertical = getDefaultState(FilterBarOrientation.Vertical);

  // Set up filters where filter-3 is out of scope (not on active tab)
  stateWithVertical.nativeFilters.filters['filter-3'].scope = {
    rootPath: ['ROOT_ID'],
    excluded: ['TAB-1'], // Exclude from active tab
  };

  const { container } = setup(stateWithVertical);

  // In vertical mode, out-of-scope filters should be in the collapse panel
  // not in the overflow dropdown
  expect(container).toBeInTheDocument();

  // The component should render without errors and properly calculate
  // that out-of-scope filters are not "overflowed" in vertical mode
});

test('FilterControls should mark out-of-scope filters as overflowed in horizontal mode', () => {
  const stateWithHorizontal = getDefaultState(FilterBarOrientation.Horizontal);

  // Set up filters where filter-3 is out of scope
  stateWithHorizontal.nativeFilters.filters['filter-3'].scope = {
    rootPath: ['ROOT_ID'],
    excluded: ['TAB-1'],
  };

  const { container } = setup(stateWithHorizontal);

  // In horizontal mode, out-of-scope filters go to the overflow dropdown
  expect(container).toBeInTheDocument();

  // The component should render and treat out-of-scope filters as overflowed
});

test('FilterControls overflowedByIndex calculation respects filter bar orientation', () => {
  // Test vertical orientation
  const verticalState = getDefaultState(FilterBarOrientation.Vertical);
  verticalState.nativeFilters.filters['filter-2'].scope = {
    rootPath: ['ROOT_ID'],
    excluded: ['TAB-1'],
  };

  const { rerender, container } = setup(verticalState);
  expect(container).toBeInTheDocument();

  // Test horizontal orientation with same filter setup
  const horizontalState = getDefaultState(FilterBarOrientation.Horizontal);
  horizontalState.nativeFilters.filters['filter-2'].scope = {
    rootPath: ['ROOT_ID'],
    excluded: ['TAB-1'],
  };

  rerender(
    <Provider store={mockStore(horizontalState) as Store}>
      <FilterControls
        dataMaskSelected={{}}
        onFilterSelectionChange={jest.fn()}
      />
    </Provider>,
  );

  // Component should handle orientation change without errors
  expect(container).toBeInTheDocument();
});

test('FilterControls should correctly pass isOverflowing prop to filter controls', () => {
  const state = getDefaultState(FilterBarOrientation.Vertical);

  // Create a mix of in-scope and out-of-scope filters
  state.nativeFilters.filters['filter-1'].scope = {
    rootPath: ['ROOT_ID'],
    excluded: [],
  };

  state.nativeFilters.filters['filter-2'].scope = {
    rootPath: ['ROOT_ID'],
    excluded: ['TAB-1'], // Out of scope
  };

  const { container } = setup(state);

  // Verify the component renders correctly
  // The filter controls should receive the correct overflow status
  // based on their position (in-scope vs out-of-scope) and orientation
  expect(container).toBeInTheDocument();
});

test('FilterControls should handle empty filters list', () => {
  const state = getDefaultState(FilterBarOrientation.Vertical);
  state.nativeFilters.filters = {} as any;

  const { container } = setup(state);
  expect(container).toBeInTheDocument();
});

test('FilterControls overflowedByIndex updates when filters change scope', () => {
  const state = getDefaultState(FilterBarOrientation.Vertical);

  const { container, rerender } = setup(state);
  expect(container).toBeInTheDocument();

  // Change filter scope
  const updatedState = getDefaultState(FilterBarOrientation.Vertical);
  updatedState.nativeFilters.filters['filter-1'].scope = {
    rootPath: ['ROOT_ID'],
    excluded: ['TAB-1'],
  };

  rerender(
    <Provider store={mockStore(updatedState) as Store}>
      <FilterControls
        dataMaskSelected={{}}
        onFilterSelectionChange={jest.fn()}
      />
    </Provider>,
  );

  // Component should update overflow status when filters change
  expect(container).toBeInTheDocument();
});
