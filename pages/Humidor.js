import { useState, useEffect } from 'react';
import {
  useQuery,
} from '@apollo/client';
import { StyleSheet, Text, SafeAreaView } from 'react-native';
import {
  GET_ALL_CIGARS,
} from '../queries/clientQueries'
import AddCigarBtn from '../components/AddCigarBtn'
import CigarList from '../components/CigarList';
import AddToHumidorModal from '../components/AddToHumidorModal';

function Humidor() {
  const [humidorModal, setHumidorModal] = useState(false);
  const { loading, error, data } = useQuery(GET_ALL_CIGARS);
  const [cigarDescription, setCigarDescription] = useState("");
  const [cigarWrapper, setCigarWrapper] = useState("");
  const [cigarBinder, setCigarBinder] = useState("");
  const [cigarFiller, setCigarFiller] = useState("");
  const [cigarImage, setCigarImage] = useState("");
  const [brandArr, setBrandArr] = useState([]);
  const [cigarNameArr, setCigarNameArr] = useState([]);
  const [cigarSizeArr, setCigarSizeArr] = useState([]);
  
  useEffect(() => {
    const filterByBrand = data?.cigars?.filter((objArr, index, arr) => index === arr.findIndex(obj => (obj.brand === objArr.brand)));
    let brandsArr = [];
    filterByBrand?.forEach((cigar, index) => {
      brandsArr.push({ label: cigar.brand, value: cigar.brand })
    });
    if (brandsArr.length !== 0) {
      setBrandArr(brandsArr);
    }
  }, [data]);

  function fillCigarName(brand) {
    const filterCigarByBrand = data?.cigars?.filter(objArr => (brand === objArr.brand));
    let cigarArr = [];
    filterCigarByBrand?.forEach((cigar, index) => {
      cigarArr.push({ label: cigar.name, value: cigar.name })
    });
    const cigarName = cigarArr.reduce((accumulator, current) => {
      if (!accumulator.find(cigar => cigar.label === current.label)) {
        accumulator.push(current);
      }
      return accumulator;
    }, []);
    setCigarNameArr(cigarName);
  }

  function fillCigarSize(name) {
    const filterCigarSize = data?.cigars?.filter(objArr => (name === objArr.name));
    let cigarArr = [];
    filterCigarSize?.forEach(cigar => {
      if (cigar.size) {
        cigar.size.map(item => {
          cigarArr.push({ label: item.length, value: item.length })
        })
      }
    });

    const cigarSizes = cigarArr.reduce((accumulator, current) => {
      if (!accumulator.find(size => size.label === current.label)) {
        accumulator.push(current);
      }
      return accumulator;
    }, []);

    if (filterCigarSize.length > 0) {
      setCigarDescription(filterCigarSize[0].description);
      setCigarWrapper(filterCigarSize[0].wrapper);
      setCigarBinder(filterCigarSize[0].binder);
      setCigarFiller(filterCigarSize[0].filler);
    }
    setCigarSizeArr(cigarSizes);
  }

  function resetModal() {
    setCigarDescription("")
    setCigarWrapper("")
    setCigarBinder("")
    setCigarFiller("")
  }

  console.log(loading, error)
  
  return (
    <>
      <SafeAreaView style={styles.container}>
        <Text style={styles.mainTitle}>Humidor</Text>
        <CigarList />
      </SafeAreaView>
      <AddCigarBtn bgColor='red' shape='round' setHumidorModal={setHumidorModal} />
      {
        humidorModal && !loading && !error &&
          <AddToHumidorModal
            toggleAddWindow={setHumidorModal}
            fillCigarSize={fillCigarSize}
            fillCigarName={fillCigarName}
            brandArr={brandArr}
            cigarNameArr={cigarNameArr}
            cigarSizeArr={cigarSizeArr}
            cigarDescription={cigarDescription}
            cigarWrapper={cigarWrapper}
            cigarBinder={cigarBinder}
            cigarFiller={cigarFiller}
            cigarImage={cigarImage}
            resetModal={resetModal}
          />
      }
    </>
  );
}

export default Humidor;

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  mainTitle: {
    fontFamily: 'Verdana',
    fontSize: 25,
    textAlign: 'center'
  }
});
