import React, { useEffect, useRef, useState } from 'react';
import { Modal, Form, FloatingLabel, Button } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useFormik } from 'formik';
import { useNavigate } from 'react-router-dom';
import * as yup from 'yup';
import { faker } from '@faker-js/faker';
import axios from 'axios';
import { useSnippets } from '../../hooks';

import { actions as modalActions } from '../../slices/modalSlice.js';
import routes from '../../routes';
import { actions as snippetsActions } from '../../slices/snippetsSlice';

const generateInitialName = () => {
  const adjectiveLength = 3 + Math.round(Math.random() * 6);
  const adjective = faker.word.adjective(adjectiveLength);
  const animal = faker.animal.type();
  return `${adjective}-${animal}`;
};

function NewRepl() {
  const [userData, setUserData] = useState({});

  const dispatch = useDispatch();
  const inputRef = useRef();
  const { t } = useTranslation();
  const snippetsApi = useSnippets();
  const navigate = useNavigate();
  const { code, currentLanguage } = useSelector(({ editor, languages }) => ({
    code: editor.code,
    currentLanguage: languages.currentLanguage,
  }));
  const languages = new Map()
    .set('javascript', '.js')
    .set('python', '.py')
    .set('php', '.php');

  useEffect(() => {
    const fetchUserSnippets = async () => {
      const response = await axios.get(routes.userProfilePath());
      setUserData(response.data.currentUser);
      dispatch(snippetsActions.addSnippets(response.data.snippets));
    };
    fetchUserSnippets();
  }, []);

  useEffect(() => {
    inputRef.current.focus();
  });

  const formik = useFormik({
    initialValues: {
      name: generateInitialName(),
    },
    validationSchema: yup.object({
      name: yup
        .string()
        .required(t('modals.validation.required'))
        .max(20, t('modals.validation.snippetNameMaxLength'))
        .matches(/^[a-zA-Z0-9_-]*$/, t('modals.validation.singleWord')),
    }),
    onSubmit: async (values, actions) => {
      actions.setSubmitting(true);
      try {
        const name = `${values.name}${languages.get(currentLanguage)}`;
        const id = await snippetsApi.saveSnippet(code, name);
        const link = snippetsApi.genViewSnippetLink(userData.login, id);
        const url = new URL(link);
        navigate(`${url.pathname}${url.search}`);
        dispatch(modalActions.closeModal());
        actions.setSubmitting(false);
      } catch (err) {
        actions.setSubmitting(false);
        if (!err.isAxiosError) {
          console.log(t('errors.unknown'));
          throw err;
        } else {
          console.log(t('errors.network'));
          throw err;
        }
      }
    },
  });

  return (
    <Modal
      animation
      centered
      onHide={() => dispatch(modalActions.closeModal())}
      show
    >
      <Modal.Header
        className="bg-dark text-white border-secondary"
        closeButton
        closeVariant="white"
      >
        <Modal.Title>{t('modals.newSnippetName')}</Modal.Title>
      </Modal.Header>

      <Modal.Body className="bg-dark">
        <Form onSubmit={formik.handleSubmit}>
          <Form.Group className="mb-3">
            <FloatingLabel
              controlId="name"
              label={t('modals.share.snippetNameLabel')}
              className="text-white"
            >
              <Form.Control
                className="text-white bg-dark border-secondary"
                name="name"
                onChange={formik.handleChange}
                placeholder={t('modals.share.snippetNameLabel')}
                ref={inputRef}
                value={formik.values.name}
                isInvalid={formik.touched.name && formik.errors.name}
              />

              <Form.Control.Feedback type="invalid">
                {formik.touched.name && formik.errors.name}
              </Form.Control.Feedback>
            </FloatingLabel>
          </Form.Group>

          <div
            className="d-flex mt-4 justify-content-end"
            style={{ columnGap: '12px' }}
          >
            <Button
              variant="danger"
              onClick={() => dispatch(modalActions.closeModal())}
              type="button"
              style={{ width: 'calc(20% - 10px)' }}
            >
              {t('modals.cancelButton')}
            </Button>
            <div className="gap" style={{ marginLeft: 'auto' }} />
            <Button
              variant="success"
              disabled={formik.isSubmitting}
              type="submit"
              style={{ width: 'calc(35% - 10px)' }}
            >
              {t('modals.share.saveSnippetButton')}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
}

export default NewRepl;
