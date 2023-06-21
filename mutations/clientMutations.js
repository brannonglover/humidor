import { gql } from '@apollo/client'

export const ADD_HUMIDOR_CIGAR = gql`
  mutation AddHumidor($cigarBrand: String!, $cigarName: String!, $cigarDescription: String!, $cigarWrapper: String!, $cigarBinder: String!, $cigarFiller: String!, $cigarSize: String!, $cigarImage: String!) {
    addToHumidor(brand: $cigarBrand, name: $cigarName, description: $cigarDescription, wrapper: $cigarWrapper, binder: $cigarBinder, filler: $cigarFiller, size: $cigarSize, image: $cigarImage) {
      id
      brand
      name
      description
      wrapper
      binder
      filler
      size
      image
    }
  }
`

export const ADD_FAVORITE_CIGAR = gql`
  mutation AddFavorite($cigarBrand: String!, $cigarName: String!, $cigarDescription: String!, $cigarWrapper: String!, $cigarBinder: String!, $cigarFiller: String!, $cigarSize: String!, $cigarImage: String!) {
    addFavorite(brand: $cigarBrand, name: $cigarName, description: $cigarDescription, wrapper: $cigarWrapper, binder: $cigarBinder, filler: $cigarFiller, size: $cigarSize, image: $cigarImage) {
      id
      brand
      name
      description
      wrapper
      binder
      filler
      size
      image
    }
  }
`

export const ADD_DISLIKE_CIGAR = gql`
  mutation AddDislike($cigarBrand: String!, $cigarName: String!, $cigarDescription: String!, $cigarWrapper: String!, $cigarBinder: String!, $cigarFiller: String!, $cigarSize: String!, $cigarImage: String!) {
    addDislike(brand: $cigarBrand, name: $cigarName, description: $cigarDescription, wrapper: $cigarWrapper, binder: $cigarBinder, filler: $cigarFiller, size: $cigarSize, image: $cigarImage) {
      id
      brand
      name
      description
      wrapper
      binder
      filler
      size
      image
    }
  }
`