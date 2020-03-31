import React from 'react';
import EditJSONField from './EditJSONField';

const BodyField = ({ record }) => (
  <EditJSONField json={record.request.body} loaded onChange={data => {
    console.log(data);
  }} />
);

export default BodyField;
