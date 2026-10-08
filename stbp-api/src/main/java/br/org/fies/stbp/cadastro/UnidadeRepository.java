package br.org.fies.stbp.cadastro;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UnidadeRepository extends JpaRepository<Unidade, Long> {

    @EntityGraph(attributePaths = "instituicoes")
    List<Unidade> findAllByOrderByNome();

    Optional<Unidade> findByNomeIgnoreCase(String nome);
}
