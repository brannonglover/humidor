import { gql } from '@apollo/client'

export const ADD_FAVORITE_CIGAR = gql`
  mutation AddCigar($cigarBrand: String!, $cigarName: String!, $cigarDescription: String!, $cigarWrapper: String!, $cigarBinder: String!, $cigarFiller: String!, $cigarSize: String!, $cigarImage: String!) {
    addCigar(brand: $cigarBrand, name: $cigarName, description: $cigarDescription, wrapper: $cigarWrapper, binder: $cigarBinder, filler: $cigarFiller, size: $cigarSize, image: $cigarImage) {
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