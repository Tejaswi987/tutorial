// Write your code here.
import './index.css'

const ThumbnailItem = props => {
  const {imageDetails, selectThumbnailId, isActive} = props

  const {id, thumbnailUrl, thumbnailAltText} = imageDetails

  const thumbnailClassName = isActive ? 'thumbnail' : 'active'

  const onClickThumbnail = () => {
    selectThumbnailId(id)
  }

  return (
    <li className="thumbnail-list-item">
      <button
        type="button"
        className="thumbnail-button"
        onClick={onClickThumbnail}
      >
        <img
          src={thumbnailUrl}
          alt={thumbnailAltText}
          className={thumbnailClassName}
        />
      </button>
    </li>
  )
}

export default ThumbnailItem
