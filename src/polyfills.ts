if (!Object.entries) {
  // eslint-disable-next-line func-names
  Object.entries = function (obj: any) {
    const ownProps = Object.keys(obj);
    let i = ownProps.length;
    const resArray = new Array(i); // preallocate the Array

    while (i--) resArray[i] = [ownProps[i], obj[ownProps[i]]];
    return resArray;
  };
}

if (!Object.fromEntries) {
  Object.fromEntries = function fromEntries(iterable: any) {
    return [...iterable].reduce((obj, [key, val]) => {
      // eslint-disable-next-line no-param-reassign
      obj[key] = val;
      return obj;
    }, {});
  };
}
