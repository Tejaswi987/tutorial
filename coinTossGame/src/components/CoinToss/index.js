// Write your code here
import {Component} from 'react'

import './index.css'

const headImgUrl = 'https://assets.ccbp.in/frontend/react-js/heads-img.png'

const tailsImgUrl = 'https://assets.ccbp.in/frontend/react-js/tails-img.png'

class CoinToss extends Component {
  state = {
    tossResultImg: headImgUrl,
    headsCount: 0,
    tailsCount: 0,
  }

  onTossCoin = () => {
    const {headsCount, tailsCount} = this.state
    const tossResult = Math.floor(Math.random() * 2)
    let tossImage = ''
    let tossHeadCount = headsCount
    let tossTailsCount = tailsCount

    if (tossResult === 0) {
      tossImage = headImgUrl
      tossHeadCount += 1
    } else {
      tossImage = tailsImgUrl
      tossTailsCount += 1
    }
    this.setState({
      tossResultImg: tossImage,
      headsCount: tossHeadCount,
      tailsCount: tossTailsCount,
    })
  }

  render() {
    const {tossResultImg, headsCount, tailsCount} = this.state

    return (
      <div className="app-container">
        <div className="coin-toss-container">
          <h1 className="heading">Coin Toss Game</h1>
          <p className="description">Heads (or) Tails</p>
          <img
            src={tossResultImg}
            alt="toss result"
            className="toss-result-img"
          />
          <button type="button" className="button" onClick={this.onTossCoin}>
            Toss Coin
          </button>
          <div className="counts-container">
            <p className="count">Total: {headsCount + tailsCount}</p>
            <p className="count">Heads: {headsCount}</p>
            <p className="count">Tails: {tailsCount}</p>
          </div>
        </div>
      </div>
    )
  }
}

export default CoinToss
