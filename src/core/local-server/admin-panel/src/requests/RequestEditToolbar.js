import React, { useCallback } from 'react';
import { useFormState } from 'react-final-form';
import {
  SaveButton,
  Toolbar,
  useUpdate,
  useRedirect,
  useNotify
} from 'react-admin';

const RequesteEditToolbar = props => {
  const SaveRequestButton = ({ handleSubmitWithRedirect, ...props }) => {
    const redirectTo = useRedirect();
    const notify = useNotify();
    const { basePath } = props;
    const formState = useFormState()
    const [response] = useUpdate('ccstore/response', formState.values.id);
    const [request] = useUpdate('ccstore/request', formState.values.id);

    const updateRequest = useCallback(payload => new Promise((resolve, reject) => {
      request({
          payload: {
            data: payload
          }
        },
        {
          onSuccess: resolve,
          onFailure: reject
        }
      );
    }), [ request ]);

    const updateResponse = useCallback(payload => new Promise((resolve, reject) => {
      response({
        payload: {
            data: payload
          }
        },
        {
          onSuccess: resolve,
          onFailure: reject
        }
      );
    }), [ response ]);

    const handleClick = useCallback(async () => {
        if (!formState.valid) {
            return;
        }

        try {
          const {newResponseData, ...requestPayload} = formState.values;

          await updateRequest(requestPayload);
          if(newResponseData) {
            await updateResponse(newResponseData);
          }

          notify('ra.notification.updated', 'info', { smart_count: 1 }, false);
          redirectTo(basePath, basePath);
        } catch(error) {
          notify('data_provider_error', 'error', { smart_count: 1 }, false);
          console.log(error);
        }
    }, [
        formState.valid,
        formState.values,
        updateRequest,
        updateResponse,
        notify,
        redirectTo,
        basePath,
    ]);

    return <SaveButton {...props} handleSubmitWithRedirect={handleClick} />;
  };

  return (
    <Toolbar {...props} >
      <SaveRequestButton />
    </Toolbar>
  );
}

export default RequesteEditToolbar;
