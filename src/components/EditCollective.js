import React from 'react';
import PropTypes from 'prop-types';
import Header from './Header';
import Body from './Body';
import Footer from './Footer';
import SignInForm from './SignInForm';
import EditCollectiveForm from './EditCollectiveForm';
import CollectiveCover from './CollectiveCover';
import { defaultBackgroundImage } from '../constants/collectives';
import { getStripeToken } from '../lib/stripe';
import { defineMessages } from 'react-intl';
import withIntl from '../lib/withIntl';
import { Router } from '../server/pages';
import Loading from './Loading';

class EditCollective extends React.Component {
  static propTypes = {
    collective: PropTypes.object.isRequired,
    LoggedInUser: PropTypes.object.isRequired,
    editCollective: PropTypes.func.isRequired,
    deleteCollective: PropTypes.func.isRequired,
    loggedInEditDataLoaded: PropTypes.bool.isRequired,
  };

  constructor(props) {
    super(props);
    this.editCollective = this.editCollective.bind(this);
    this.deleteCollective = this.deleteCollective.bind(this);
    this.state = { status: null, result: {} };
    this.messages = defineMessages({
      'creditcard.error': {
        id: 'creditcard.error',
        defaultMessage: 'Invalid credit card',
      },
    });
  }

  componentDidMount() {
    window.OC = window.OC || {};
    window.OC.editCollective = this.editCollective.bind(this);
  }

  async validate(CollectiveInputType) {
    const { intl } = this.props;
    const tiers = this.cleanTiers(CollectiveInputType.tiers);
    if (tiers) {
      CollectiveInputType.tiers = tiers;
    }

    if (typeof CollectiveInputType.tags === 'string') {
      CollectiveInputType.tags = CollectiveInputType.tags
        .split(',')
        .map(t => t.trim());
    }
    if (
      CollectiveInputType.backgroundImage ===
      defaultBackgroundImage[CollectiveInputType.type]
    ) {
      delete CollectiveInputType.backgroundImage;
    }

    const { collective } = this.props;
    CollectiveInputType.settings = {
      ...collective.settings,
      goals: CollectiveInputType.goals,
      editor: CollectiveInputType.markdown ? 'markdown' : 'html',
      sendInvoiceByEmail: CollectiveInputType.sendInvoiceByEmail,
      tos: CollectiveInputType.tos,
    };
    delete CollectiveInputType.goals;
    delete CollectiveInputType.markdown;
    delete CollectiveInputType.sendInvoiceByEmail;
    delete CollectiveInputType.tos;

    if (!CollectiveInputType.paymentMethods) return CollectiveInputType;

    let newPaymentMethod, index;
    CollectiveInputType.paymentMethods.forEach((pm, i) => {
      if (pm.id) return;
      newPaymentMethod = pm;
      index = i;
      return;
    });

    if (!newPaymentMethod) return CollectiveInputType;

    const card = newPaymentMethod.card;
    let res;
    try {
      res = await getStripeToken('cc', card);
      const last4 = res.card.last4;
      const paymentMethod = {
        name: last4,
        token: res.token,
        monthlyLimitPerMember: newPaymentMethod.monthlyLimitPerMember,
        currency: CollectiveInputType.currency,
        data: {
          last4,
          fullName: res.card.full_name,
          expMonth: res.card.exp_month,
          expYear: res.card.exp_year,
          brand: res.card.brand,
          country: res.card.country,
          funding: res.card.funding,
          zip: res.card.address_zip,
        },
      };
      CollectiveInputType.paymentMethods[index] = paymentMethod;
      return CollectiveInputType;
    } catch (e) {
      this.setState({
        result: {
          error: `${intl.formatMessage(
            this.messages['creditcard.error'],
          )}: ${e}`,
        },
      });
      return false;
    }
  }

  cleanTiers(tiers) {
    if (!tiers) return null;
    return tiers.map(tier => {
      let resetAttributes = [];
      switch (tier.type) {
        case 'TICKET':
        case 'PRODUCT':
          resetAttributes = ['interval', 'presets'];
          break;
        case 'MEMBERSHIP':
        case 'SERVICE':
          resetAttributes = ['presets', 'maxQuantity'];
          break;
        case 'DONATION':
          resetAttributes = ['maxQuantity'];
          break;
      }
      const cleanTier = { ...tier };
      resetAttributes.map(attr => {
        cleanTier[attr] = null;
      });
      if (tier._amountType === 'fixed') {
        cleanTier.presets = null;
      }
      delete cleanTier._amountType;
      return cleanTier;
    });
  }

  async editCollective(CollectiveInputType) {
    CollectiveInputType = await this.validate(CollectiveInputType);
    if (!CollectiveInputType) {
      return false;
    }

    this.setState({ status: 'loading' });
    try {
      await this.props.editCollective(CollectiveInputType);
      this.setState({ status: 'saved' });
      setTimeout(() => {
        this.setState({ status: null });
      }, 3000);
    } catch (err) {
      console.error('>>> editCollective error:', JSON.stringify(err));
      const errorMsg =
        err.graphQLErrors && err.graphQLErrors[0]
          ? err.graphQLErrors[0].message
          : err.message;
      this.setState({ status: null, result: { error: errorMsg } });
      throw new Error(errorMsg);
    }
  }

  async deleteCollective() {
    const { collective } = this.props;
    if (confirm('😱 Are you really sure you want to delete this collective?')) {
      this.setState({ status: 'loading' });
      try {
        await this.props.deleteCollective(collective.id);
        this.setState({
          status: null,
          result: { success: 'Collective deleted successfully' },
        });
        const collectiveRoute = `/${collective.parentCollective.slug}`;
        Router.pushRoute(collectiveRoute);
      } catch (err) {
        console.error('>>> deleteCollective error: ', JSON.stringify(err));
        const errorMsg =
          err.graphQLErrors && err.graphQLErrors[0]
            ? err.graphQLErrors[0].message
            : err.message;
        this.setState({ result: { error: errorMsg } });
        throw new Error(errorMsg);
      }
    }
  }

  render() {
    const { LoggedInUser, collective, loggedInEditDataLoaded } = this.props;

    if (!collective || !collective.slug) return <div />;

    const title = `Edit ${collective.name} ${collective.type.toLowerCase()}`;
    const canEditCollective =
      LoggedInUser && LoggedInUser.canEditCollective(collective);

    return (
      <div className="EditCollective">
        <style jsx>
          {`
            .success {
              color: green;
            }
            .error {
              color: red;
            }
            .login {
              text-align: center;
            }
            .actions {
              text-align: center;
              margin-bottom: 5rem;
            }
          `}
        </style>

        <Header
          title={collective.name}
          description={collective.description}
          twitterHandle={collective.twitterHandle}
          image={collective.image || collective.backgroundImage}
          className={this.state.status}
          LoggedInUser={LoggedInUser}
        />

        <Body>
          <CollectiveCover
            href={`/${collective.slug}`}
            collective={collective}
            title={title}
            className="small"
          />

          <div className="content">
            {!canEditCollective && (
              <div className="login">
                <p>
                  You need to be logged in as the creator of this collective
                  <br />
                  or as a core contributor of the {collective.name} collective.
                </p>
                <SignInForm next={`/${collective.slug}/edit`} />
              </div>
            )}
            {canEditCollective && !loggedInEditDataLoaded && <Loading />}
            {canEditCollective &&
              loggedInEditDataLoaded && (
                <div>
                  <EditCollectiveForm
                    collective={collective}
                    LoggedInUser={LoggedInUser}
                    onSubmit={this.editCollective}
                    status={this.state.status}
                  />
                  <div className="actions">
                    {collective.type === 'EVENT' && (
                      <a onClick={this.deleteCollective}>delete event</a>
                    )}
                    <div className="result">
                      <div className="success">{this.state.result.success}</div>
                      <div className="error">{this.state.result.error}</div>
                    </div>
                  </div>
                </div>
              )}
          </div>
        </Body>
        <Footer />
      </div>
    );
  }
}

export default withIntl(EditCollective);
