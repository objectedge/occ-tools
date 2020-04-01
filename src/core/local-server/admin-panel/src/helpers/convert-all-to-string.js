const convertAllToString = (content) => {
  const iterableContent = Array.isArray(content) ? content : Object.keys(content);

  for(const contentKey of iterableContent) {
    const contentItem = content[contentKey];
    if(Object.prototype.toString.call(contentItem) === "[object Object]" || Array.isArray(contentItem)) {
      convertAllToString(contentItem);
    } else {
     console.log(contentKey)
     content[contentKey] = contentItem.toString();
    }
  }

  return content;
};

export default convertAllToString;
