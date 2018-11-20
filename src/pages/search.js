import React from 'react';
import PropTypes from 'prop-types';
import { ControlLabel, FormControl, FormGroup } from 'react-bootstrap';
import { Box, Flex } from 'grid-styled';
import { withRouter } from 'next/router';
import styled from 'styled-components';

import { Link, Router } from '../server/pages';

import Body from '../components/Body';
import Button from '../components/Button';
import CollectiveCard from '../components/CollectiveCard';
import ErrorPage from '../components/ErrorPage';
import Footer from '../components/Footer';
import Header from '../components/Header';
import LoadingGrid from '../components/LoadingGrid';
import StyledLink from '../components/StyledLink';
import Pagination from '../components/Pagination';
import Container from '../components/Container';
import colors from '../constants/colors';

import { addSearchQueryData } from '../graphql/queries';

import withData from '../lib/withData';
import withIntl from '../lib/withIntl';
import withLoggedInUser from '../lib/withLoggedInUser';

const { USE_PLEDGES } = process.env;

const SearchInput = styled(FormControl)`
  &&& {
    border: none;
    border-bottom: 2px solid ${colors.blue};
    border-radius: 0;
    box-shadow: none;
    display: block;
    height: 3.4rem;
    padding: 0;
  }
`;

const SearchButton = styled(Button).attrs({
  className: 'blue',
})`
  && {
    padding: 0 2rem;
  }
`;

class SearchPage extends React.Component {
  static getInitialProps({ query }) {
    return {
      term: query.q || '',
      limit: query.limit || 20,
      offset: query.offset || 0,
      usePledges: USE_PLEDGES || false,
    };
  }

  static propTypes = {
    term: PropTypes.string, // for addSearchQueryData
    limit: PropTypes.number, // for addSearchQueryData
    offset: PropTypes.number, // for addSearchQueryData
    router: PropTypes.object, // from next.js
    data: PropTypes.object.isRequired, // from withData
    getLoggedInUser: PropTypes.func.isRequired, // from withLoggedInUser
    usePledges: PropTypes.bool,
  };

  static defaultProps = {
    usePledges: false,
  };

  state = {
    loadingUserLogin: true,
    LoggedInUser: undefined,
  };

  async componentDidMount() {
    const { getLoggedInUser } = this.props;
    try {
      const LoggedInUser = await getLoggedInUser();
      this.setState({
        loadingUserLogin: false,
        LoggedInUser,
      });
    } catch (error) {
      this.setState({ loadingUserLogin: false });
    }
  }

  refetch = event => {
    event.preventDefault();

    const { target: form } = event;
    const { router } = this.props;
    const { q } = form;

    router.push({ pathname: router.pathname, query: { q: q.value } });
  };

  changePage = offset => {
    const { router } = this.props;
    Router.pushRoute('search', { ...router.query, offset });
  };

  render() {
    const {
      data: { error, loading, search },
      term = '',
      usePledges,
    } = this.props;
    const { loadingUserLogin, LoggedInUser } = this.state;

    if (error) {
      return <ErrorPage data={this.props.data} />;
    }

    const { collectives, limit = 20, offset, total = 0 } = search || {};

    const showCollectives = !loading && term.trim() !== '' && !!collectives;

    return (
      <div>
        <Header
          title="Search"
          className={loadingUserLogin ? 'loading' : ''}
          LoggedInUser={LoggedInUser}
          showSearch={false}
        />
        <Body>
          <Container mx="auto" px={3} width={[1, 0.85]} maxWidth={1200}>
            <Box width={1}>
              <form method="GET" onSubmit={this.refetch}>
                <FormGroup controlId="search" bsSize="large">
                  <ControlLabel className="h1">
                    Search Open Collective
                  </ControlLabel>
                  <Flex alignItems="flex-end" my={3}>
                    <SearchInput
                      type="search"
                      name="q"
                      placeholder="open source"
                      defaultValue={term}
                    />
                    <SearchButton type="submit">
                      <span className="fa fa-search" />
                    </SearchButton>
                  </Flex>
                </FormGroup>
              </form>
            </Box>
            <Flex
              justifyContent={['center', 'center', 'flex-start']}
              flexWrap="wrap"
            >
              {loading && (
                <Flex py={3} width={1} justifyContent="center">
                  <LoadingGrid />
                </Flex>
              )}
              {showCollectives &&
                collectives.map(collective => (
                  <Flex key={collective.slug} my={3} mx={2}>
                    <CollectiveCard collective={collective} />
                  </Flex>
                ))}

              {/* TODO: add suggested collectives when the result is empty */}
              {showCollectives && collectives.length === 0 && (
                <Flex
                  py={3}
                  width={1}
                  justifyContent="center"
                  flexDirection="column"
                  alignItems="center"
                >
                  <p>
                    <em>
                      No collectives found matching your query: &quot;
                      {term}
                      &quot;
                    </em>
                  </p>
                  {usePledges && (
                    <Link route="createPledge" params={{ name: term }} passHref>
                      <StyledLink
                        display="block"
                        fontSize="Paragraph"
                        fontWeight="bold"
                        maxWidth="220px"
                        py={2}
                        px={4}
                        textAlign="center"
                        buttonStyle="primary"
                      >
                        Make a pledge
                      </StyledLink>
                    </Link>
                  )}
                </Flex>
              )}
            </Flex>
            {showCollectives && collectives.length !== 0 && total > limit && (
              <Container
                display="flex"
                justifyContent="center"
                fontSize="Paragraph"
                my={3}
              >
                <Pagination offset={offset} total={total} limit={limit} />
              </Container>
            )}

            {showCollectives && collectives.length !== 0 && (
              <Flex
                py={3}
                width={1}
                justifyContent="center"
                flexDirection="column"
                alignItems="center"
              >
                <p>
                  <em>
                    If you don&apos;t see the collective you&apos;re searching
                    for:
                  </em>
                </p>

                {usePledges && (
                  <Link route="createPledge" params={{ name: term }} passHref>
                    <StyledLink
                      display="block"
                      fontSize="Paragraph"
                      fontWeight="bold"
                      maxWidth="220px"
                      py={2}
                      px={4}
                      textAlign="center"
                      buttonStyle="primary"
                    >
                      Make a pledge
                    </StyledLink>
                  </Link>
                )}
              </Flex>
            )}
          </Container>
        </Body>
        <Footer />
      </div>
    );
  }
}

export { SearchPage as MockSearchPage };

export default withData(
  withIntl(withLoggedInUser(addSearchQueryData(withRouter(SearchPage)))),
);
