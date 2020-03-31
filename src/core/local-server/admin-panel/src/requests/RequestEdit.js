import React from 'react';
import {
  Edit,
  TabbedForm,
  FormTab,
} from 'react-admin';

import RequesteEditToolbar from './RequestEditToolbar';
import RequestField from '../fields/RequestField';
import BodyField from '../fields/BodyField';
import HeadersField from '../fields/HeadersField';
import ParametersField from '../fields/ParametersField';
import ResponseField from '../fields/ResponseField';

const RequestEdit = (props) => (
  <Edit {...props}>
    <TabbedForm toolbar={<RequesteEditToolbar />}>
        <FormTab label="General">
          <RequestField />
        </FormTab>
        <FormTab label="Body Payload">
          <BodyField />
        </FormTab>
        <FormTab label="Headers">
          <HeadersField />
        </FormTab>
        <FormTab label="Parameters">
          <ParametersField />
        </FormTab>
        <FormTab label="Response">
          <ResponseField />
        </FormTab>
    </TabbedForm>
  </Edit>
);

export default RequestEdit;
