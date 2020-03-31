import React from 'react';
import EditJSONField from './EditJSONField';

const ParametersField = ({ record }) => (
  <EditJSONField json={record.request.parameters} loaded onChange={data => {
    console.log(data);
  }} />
);

export default ParametersField;
