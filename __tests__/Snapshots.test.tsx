/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Dashboard } from '../src/screens/Dashboard';

test('Dashboard snapshot', async () => {
  let tree: ReactTestRenderer.ReactTestRenderer;
  
  await ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<Dashboard />);
  });

  // @ts-ignore
  expect(tree.toJSON()).toMatchSnapshot();
});